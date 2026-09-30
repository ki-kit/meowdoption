Feature: Adoption application
  As a visitor
  I want to apply to adopt a cat online
  So that the shelter can contact me

  # Relies on the sample cats from backend/app/seed.py.

  Scenario: Visitor applies to adopt a cat
    Given I open the cat "Luna"
    When I click the link "Apply to adopt Luna"
    And I fill in "Full name" with "Jana Nováková"
    And I fill in "Email" with a fresh email address
    And I choose "Apartment" as "Housing"
    And I fill in "Tell us about your home" with "Quiet flat, lots of sunny windowsills."
    And I press "Send application"
    Then I see the heading "Thank you!"
    And I see the text "We received your application for Luna"

  Scenario: Missing email is caught before sending
    Given I open the cat "Luna"
    When I click the link "Apply to adopt Luna"
    And I fill in "Full name" with "Jana Nováková"
    And I choose "House" as "Housing"
    And I press "Send application"
    Then I see the text "Please enter your email"
    And I see the heading "Apply to adopt Luna"

  Scenario: The same person cannot apply twice
    Given I open the cat "Micka"
    When I click the link "Apply to adopt Micka"
    And I fill in the application form with a fresh email address
    And I press "Send application"
    Then I see the heading "Thank you!"
    When I apply for "Micka" again with the same email address
    Then I see the text "You have already applied for this cat."

  Scenario: An adopted cat cannot be applied for
    Given I open the cat "Garfield"
    Then I see the text "Garfield has already found a home"
    And I do not see the link "Apply to adopt Garfield"
