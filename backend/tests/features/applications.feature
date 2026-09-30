Feature: Adoption applications
  As a visitor
  I want to apply to adopt a cat
  So that the shelter can contact me

  Background:
    Given the following cats exist:
      | name     | sex    | age_months | status    |
      | Micka    | female | 6          | available |
      | Líza     | female | 60         | pending   |
      | Garfield | male   | 120        | adopted   |

  Scenario: Valid application is accepted
    When I apply for "Micka" with:
      | full_name   | email              | housing_type | has_other_pets | message             |
      | Jana Nováková | jana@example.com | apartment    | false          | I have a quiet flat. |
    Then the response status is 201
    And the application status is "new"
    And "Micka" has 1 application from "jana@example.com"

  Scenario: Phone and message are optional
    When I apply for "Micka" with:
      | full_name | email           | housing_type      | has_other_pets |
      | Petr Novák | petr@example.com | house_with_garden | true           |
    Then the response status is 201

  Scenario: The response does not echo personal data
    When I apply for "Micka" with:
      | full_name | email           | housing_type | has_other_pets |
      | Petr Novák | petr@example.com | house        | false          |
    Then the response has only "id, cat_id, status, created_at"

  Scenario: Missing email is rejected
    When I apply for "Micka" with:
      | full_name | housing_type | has_other_pets |
      | Petr Novák | apartment    | false          |
    Then the response status is 422
    And the error is about "email"
    And "Micka" has 0 applications

  Scenario: Invalid email is rejected
    When I apply for "Micka" with:
      | full_name | email       | housing_type | has_other_pets |
      | Petr Novák | not-an-email | apartment    | false          |
    Then the response status is 422
    And the error is about "email"

  Scenario: Blank name is rejected
    When I apply for "Micka" with:
      | full_name | email           | housing_type | has_other_pets |
      |           | petr@example.com | apartment    | false          |
    Then the response status is 422
    And the error is about "full_name"

  Scenario: Unknown housing type is rejected
    When I apply for "Micka" with:
      | full_name | email           | housing_type | has_other_pets |
      | Petr Novák | petr@example.com | castle       | false          |
    Then the response status is 422
    And the error is about "housing_type"

  Scenario: Applying for an adopted cat is refused
    When I apply for "Garfield" with:
      | full_name | email           | housing_type | has_other_pets |
      | Petr Novák | petr@example.com | apartment    | false          |
    Then the response status is 409
    And "Garfield" has 0 applications

  Scenario: A pending cat still accepts applications
    When I apply for "Líza" with:
      | full_name | email           | housing_type | has_other_pets |
      | Petr Novák | petr@example.com | apartment    | false          |
    Then the response status is 201

  Scenario: Applying for an unknown cat
    When I apply for a cat that does not exist
    Then the response status is 404

  Scenario: The same person cannot apply twice for the same cat
    Given "petr@example.com" already applied for "Micka"
    When I apply for "Micka" with:
      | full_name | email           | housing_type | has_other_pets |
      | Petr Novák | PETR@Example.com | apartment    | false          |
    Then the response status is 409
    And "Micka" has 1 application from "petr@example.com"

  Scenario: The same person can apply for a different cat
    Given "petr@example.com" already applied for "Micka"
    When I apply for "Líza" with:
      | full_name | email           | housing_type | has_other_pets |
      | Petr Novák | petr@example.com | apartment    | false          |
    Then the response status is 201
