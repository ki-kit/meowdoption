Feature: Admin authentication
  As a shelter admin
  I want to log in securely
  So that only staff can manage cats and applications

  Background:
    Given an admin "admin@meow.test" with password "correct horse battery"

  Scenario: Admin logs in with the correct password
    When I log in as "admin@meow.test" with password "correct horse battery"
    Then the response status is 200
    And I receive a bearer token
    And an httpOnly SameSite=strict auth cookie is set for "/api"

  Scenario: Email is case-insensitive at login
    When I log in as "Admin@Meow.TEST" with password "correct horse battery"
    Then the response status is 200

  Scenario: Wrong password is rejected
    When I log in as "admin@meow.test" with password "wrong"
    Then the response status is 401
    And no auth cookie is set
    And the error message is "Incorrect email or password"

  Scenario: Unknown email gets the same answer as a wrong password
    When I log in as "nobody@meow.test" with password "correct horse battery"
    Then the response status is 401
    And the error message is "Incorrect email or password"

  Scenario: A deactivated admin cannot log in
    Given the admin "admin@meow.test" is deactivated
    When I log in as "admin@meow.test" with password "correct horse battery"
    Then the response status is 401

  Scenario: The auth cookie identifies the admin
    Given I am logged in as "admin@meow.test" with password "correct horse battery"
    When I ask who I am
    Then the response status is 200
    And I am "admin@meow.test"

  Scenario: A bearer token identifies the admin (API / mobile clients)
    Given I have a bearer token for "admin@meow.test" with password "correct horse battery"
    When I ask who I am using the bearer token
    Then the response status is 200
    And I am "admin@meow.test"

  Scenario: Anonymous visitors are not identified
    When I ask who I am
    Then the response status is 401

  Scenario Outline: Invalid tokens are rejected
    When I ask who I am with a <kind> token
    Then the response status is 401

    Examples:
      | kind           |
      | garbage        |
      | expired        |
      | foreign-signed |
      | unknown-admin  |

  Scenario: A deactivated admin's existing token stops working
    Given I am logged in as "admin@meow.test" with password "correct horse battery"
    And the admin "admin@meow.test" is deactivated
    When I ask who I am
    Then the response status is 401

  Scenario: Logging out clears the cookie
    Given I am logged in as "admin@meow.test" with password "correct horse battery"
    When I log out
    Then the response status is 204
    And when I ask who I am the response status is 401

  Scenario: Every admin route rejects anonymous users
    Then every route that requires an admin answers 401 without credentials

  Scenario: Only the known public routes are open to anonymous users
    Then every route except these requires an admin:
      | method | path                                |
      | GET    | /api/health                         |
      | GET    | /api/v1/cats                        |
      | GET    | /api/v1/cats/{cat_id}               |
      | POST   | /api/v1/cats/{cat_id}/applications  |
      | POST   | /api/v1/auth/login                  |
      | POST   | /api/v1/auth/logout                 |
