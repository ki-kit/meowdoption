Feature: Cat catalog
  As a visitor
  I want to browse and filter the cats
  So that I can find one that fits my home

  # Relies on the sample cats from backend/app/seed.py.

  Scenario: Visitor browses the catalog from the home page
    Given I open the home page
    When I click the link "Browse cats"
    Then I see the heading "Our cats"
    And I see the cat "Luna"
    And I see the cat "Oskar"

  Scenario: Visitor filters to castrated females and sees only matching cats
    Given I open "/cats"
    When I choose "Female" as "Sex"
    And I choose "Yes" as "Castrated"
    Then I see the cat "Luna"
    And I do not see the cat "Micka"
    And I do not see the cat "Oskar"
    And every cat shown is "♀ Female" and "Castrated"

  Scenario: Filters survive a page reload
    Given I open "/cats?sex=male"
    When I reload the page
    Then "Sex" is set to "Male"
    And I do not see the cat "Luna"

  Scenario: Visitor opens a cat's detail page
    Given I open "/cats"
    When I click the link "Luna"
    Then I see the heading "Luna"
    And I see the text "British Shorthair"

  Scenario: Unknown cat
    Given I open "/cats/999999"
    Then I see the heading "Cat not found"
