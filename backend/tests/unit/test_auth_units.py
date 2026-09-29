import io

import pytest
from pydantic import ValidationError

from app import cli
from app.config import DEV_SECRET, Settings
from app.models import AdminUser
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.services.admins import AdminError, create_admin


def test_password_is_hashed_not_stored_plainly():
    h = hash_password("correct horse battery")
    assert "correct horse battery" not in h
    assert h.startswith("$argon2id$")
    assert verify_password("correct horse battery", h)
    assert not verify_password("wrong", h)


def test_unknown_user_verification_is_always_false():
    assert verify_password("anything", None) is False


def test_token_roundtrip():
    assert decode_access_token(create_access_token(42)) == 42


def test_token_with_alg_none_is_rejected():
    import jwt

    forged = jwt.encode({"sub": "1", "exp": 9999999999}, key=None, algorithm="none")
    assert decode_access_token(forged) is None


class TestCreateAdmin:
    def test_stores_lowercased_email(self, db_session):
        admin = create_admin(db_session, "  Boss@Meow.TEST ", "long enough password")
        assert admin.email == "boss@meow.test"

    def test_rejects_short_password(self, db_session):
        with pytest.raises(AdminError, match="at least"):
            create_admin(db_session, "a@meow.test", "short")

    def test_rejects_duplicate(self, db_session):
        create_admin(db_session, "a@meow.test", "long enough password")
        with pytest.raises(AdminError, match="already exists"):
            create_admin(db_session, "A@meow.test", "another long password")


class TestCli:
    @pytest.fixture(autouse=True)
    def _use_test_db(self, monkeypatch, session_factory):
        monkeypatch.setattr(cli, "SessionLocal", session_factory)

    def test_create_admin_from_stdin(self, monkeypatch, capsys, db_session):
        monkeypatch.setattr("sys.stdin", io.StringIO("long enough password\n"))
        assert cli.main(["create-admin", "cli@meow.test", "--password-stdin"]) == 0
        assert "Created admin cli@meow.test" in capsys.readouterr().out
        assert db_session.query(AdminUser).filter_by(email="cli@meow.test").one()

    def test_errors_exit_nonzero(self, monkeypatch, capsys):
        monkeypatch.setattr("sys.stdin", io.StringIO("short\n"))
        assert cli.main(["create-admin", "cli@meow.test", "--password-stdin"]) == 1
        assert "at least" in capsys.readouterr().err

    def test_prompt_requires_matching_passwords(self, monkeypatch, capsys):
        answers = iter(["long enough password", "different password!!"])
        monkeypatch.setattr("getpass.getpass", lambda _prompt: next(answers))
        assert cli.main(["create-admin", "cli@meow.test"]) == 1
        assert "don't match" in capsys.readouterr().err


class TestProductionSafety:
    PROD = {"env": "production", "secret_key": "x" * 48, "cookie_secure": True}

    @pytest.fixture(autouse=True)
    def _hermetic_env(self, monkeypatch):
        # Settings reads MEOW_* env vars (compose sets some); test only what we pass.
        import os

        for key in os.environ:
            if key.startswith("MEOW_"):
                monkeypatch.delenv(key)

    def _settings(self, **values) -> Settings:
        return Settings(_env_file=None, **values)

    def test_valid_production_settings(self):
        self._settings(**self.PROD)

    @pytest.mark.parametrize(
        "override",
        [
            {"secret_key": DEV_SECRET},
            {"secret_key": "too-short"},
            {"cookie_secure": False},
            {"dev_admin_email": "a@b.c", "dev_admin_password": "x"},
        ],
    )
    def test_unsafe_production_settings_refuse_to_start(self, override):
        with pytest.raises(ValidationError):
            self._settings(**{**self.PROD, **override})
