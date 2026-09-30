Feature: Admin panel
  As a shelter admin
  I want to manage cats and review applications
  So that each cat goes to the right home

  # Each scenario creates its own cat and deletes it afterwards, so the
  # sample cats other features rely on are never touched.

  Background:
    Given I am logged in as the dev admin
    And I have added a new cat

  Scenario: Admin approves an application, then the cat shows as adopted
    Given "First Visitor" and "Second Visitor" have applied for that cat
    When I open the applications for that cat
    And I approve the application from "First Visitor"
    Then the application from "First Visitor" is "Approved"
    And the application from "Second Visitor" is "Rejected"
    When I open that cat's public page
    Then I see the text "has already found a home"
    And I do not see the link "Apply to adopt"

  Scenario: Admin edits and deletes a cat
    When I edit that cat and mark it castrated
    And I open that cat's public page
    Then I see the text "Castrated"
    When I delete that cat
    And I open that cat's public page
    Then I see the heading "Cat not found"
