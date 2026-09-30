Feature: Admin reviews applications
  As a shelter admin
  I want to review adoption applications
  So that each cat goes to the right home

  Background:
    Given the following cats exist:
      | name  | sex    | age_months | status    |
      | Luna  | female | 18         | available |
      | Micka | female | 6          | available |
    And "jana@example.com" already applied for "Luna"
    And "petr@example.com" already applied for "Luna"
    And "eva@example.com" already applied for "Micka"
    And I am logged in as an admin

  Scenario: List applications with applicant details, newest first
    When I list applications
    Then the response status is 200
    And I see applications from "eva@example.com, petr@example.com, jana@example.com" in that order
    And each application shows its cat's name

  Scenario: Filter applications
    When I list applications with "status=new&cat_id=Luna"
    Then I see applications from "petr@example.com, jana@example.com" in that order

  Scenario: Approving adopts the cat and rejects the other open applications
    When I set the application from "jana@example.com" for "Luna" to "approved"
    Then the response status is 200
    And "Luna" is "adopted"
    And the application from "petr@example.com" for "Luna" is "rejected"
    And the application from "eva@example.com" for "Micka" is "new"

  Scenario: An adopted cat's rejected applicant can't be approved too
    Given the application from "jana@example.com" for "Luna" was approved
    When I set the application from "petr@example.com" for "Luna" to "approved"
    Then the response status is 409
    And the application from "jana@example.com" for "Luna" is "approved"

  Scenario: Rejecting leaves the cat alone
    When I set the application from "jana@example.com" for "Luna" to "rejected"
    Then the response status is 200
    And "Luna" is "available"
    And the application from "petr@example.com" for "Luna" is "new"

  Scenario: Undoing an approval makes the cat available again
    Given the application from "jana@example.com" for "Luna" was approved
    When I set the application from "jana@example.com" for "Luna" to "rejected"
    Then the response status is 200
    And "Luna" is "available"
    And the application from "petr@example.com" for "Luna" is "rejected"

  Scenario: A rejected application can be reopened
    Given the application from "jana@example.com" for "Luna" was approved
    When I set the application from "petr@example.com" for "Luna" to "new"
    Then the response status is 200
    And the application from "petr@example.com" for "Luna" is "new"

  Scenario: An approval can only be undone by rejecting
    Given the application from "jana@example.com" for "Luna" was approved
    When I set the application from "jana@example.com" for "Luna" to "new"
    Then the response status is 409

  Scenario: Setting the same status again changes nothing
    When I set the application from "jana@example.com" for "Luna" to "new"
    Then the response status is 200
    And the application from "petr@example.com" for "Luna" is "new"

  Scenario: Unknown application
    When I set application 999999 to "approved"
    Then the response status is 404

  Scenario: Invalid status
    When I set the application from "jana@example.com" for "Luna" to "maybe"
    Then the response status is 422

  Scenario: Visitors can't apply for a cat once it's adopted
    Given the application from "jana@example.com" for "Luna" was approved
    When a visitor applies for "Luna"
    Then the response status is 409
