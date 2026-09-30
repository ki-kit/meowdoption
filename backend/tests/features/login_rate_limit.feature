Feature: Login rate limiting
  As a shelter admin
  I want repeated failed logins to be slowed down
  So that nobody can guess my password by brute force

  Background:
    Given an admin "admin@meow.test" with password "correct horse battery"

  Scenario: Five wrong passwords block further attempts for that account
    Given 5 failed logins for "admin@meow.test" from 10.0.0.1
    When I log in as "admin@meow.test" with password "wrong" from 10.0.0.1
    Then the response status is 429
    And the response says to retry in about 15 minutes

  Scenario: While blocked, even the correct password is refused
    Given 5 failed logins for "admin@meow.test" from 10.0.0.1
    When I log in as "admin@meow.test" with password "correct horse battery" from 10.0.0.1
    Then the response status is 429
    And no auth cookie is set

  Scenario: Four failures still allow a correct login, which resets the count
    Given 4 failed logins for "admin@meow.test" from 10.0.0.1
    When I log in as "admin@meow.test" with password "correct horse battery" from 10.0.0.1
    Then the response status is 200
    And 5 more wrong passwords from 10.0.0.1 are needed before "admin@meow.test" is blocked

  Scenario: The block expires after the window
    Given 5 failed logins for "admin@meow.test" from 10.0.0.1
    When 16 minutes pass
    And I log in as "admin@meow.test" with password "correct horse battery" from 10.0.0.1
    Then the response status is 200

  Scenario: Someone else failing from elsewhere can't lock the admin out
    Given 5 failed logins for "admin@meow.test" from 10.6.6.6
    When I log in as "admin@meow.test" with password "correct horse battery" from 10.0.0.1
    Then the response status is 200

  Scenario: One address trying many accounts is blocked
    Given 20 failed logins for different emails from 10.0.0.1
    When I log in as "admin@meow.test" with password "correct horse battery" from 10.0.0.1
    Then the response status is 429

  Scenario: Email case doesn't give extra attempts
    Given 5 failed logins for "ADMIN@meow.test" from 10.0.0.1
    When I log in as "admin@meow.test" with password "correct horse battery" from 10.0.0.1
    Then the response status is 429

  Scenario: Old failures are cleaned up
    Given 5 failed logins for "admin@meow.test" from 10.0.0.1
    When 16 minutes pass
    And I log in as "someone@meow.test" with password "wrong" from 10.0.0.2
    Then only 1 recorded login failure remains
