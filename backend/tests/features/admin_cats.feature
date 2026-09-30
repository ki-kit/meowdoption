Feature: Admin manages cats
  As a shelter admin
  I want to add, edit and remove cats
  So that the catalog matches the cats we actually have

  Background:
    Given I am logged in as an admin

  Scenario: Add a cat
    When I add the cat:
      | name | sex    | age_months | breed   | castrated | good_with_kids |
      | Tom  | male   | 14         | Bengal  | true      | true           |
    Then the response status is 201
    And the cat "Tom" is listed publicly as "available" and castrated

  Scenario Outline: Invalid cats are rejected
    When I add the cat:
      | name   | sex   | age_months |
      | <name> | <sex> | <age>      |
    Then the response status is 422
    And the error is about "<field>"

    Examples:
      | name | sex    | age | field      |
      |      | male   | 12  | name       |
      | Tom  | dragon | 12  | sex        |
      | Tom  | male   | -1  | age_months |
      | Tom  | male   | 400 | age_months |

  Scenario: Edit only what changed
    Given the following cats exist:
      | name  | sex    | age_months | breed   | castrated |
      | Micka | female | 6          | Siamese | false     |
    When I change "Micka" to:
      | castrated |
      | true      |
    Then the response status is 200
    And "Micka" is castrated
    And "Micka" still has breed "Siamese" and age 6

  Scenario: A required field can't be cleared
    Given the following cats exist:
      | name  | sex    | age_months |
      | Micka | female | 6          |
    When I clear the name of "Micka"
    Then the response status is 422

  Scenario: Edit an unknown cat
    When I change cat 999999 to:
      | castrated |
      | true      |
    Then the response status is 404

  Scenario: Delete a cat and its applications
    Given the following cats exist:
      | name  | sex    | age_months |
      | Micka | female | 6          |
    And "jana@example.com" already applied for "Micka"
    When I delete "Micka"
    Then the response status is 204
    And "Micka" is gone
    And there are 0 applications in total

  Scenario: Delete an unknown cat
    When I delete cat 999999
    Then the response status is 404
