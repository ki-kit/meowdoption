Feature: Home page
  As a visitor
  I want a welcoming home page
  So that I know I'm in the right place to adopt a cat

  Scenario: Visitor opens the home page
    Given I open the home page
    Then I see the heading "Find your new best friend"
    And the page title is "Meowdoption"

  Scenario: Visitor lands on an unknown page and finds the way back
    Given I open "/no-such-page"
    Then I see the heading "Page not found"
    When I click the link "Back to home"
    Then I see the heading "Find your new best friend"

  Scenario: The web app reaches the API
    When I call the API health endpoint through the web app
    Then the API answers with status "ok"
