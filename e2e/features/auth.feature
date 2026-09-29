Feature: Admin login
  As a shelter admin
  I want to log in to the admin area
  So that only staff can manage cats and applications

  # Uses the dev admin that compose seeds (MEOW_DEV_ADMIN_*).

  Scenario: Anonymous visitor is sent to the login page
    Given I open "/admin"
    Then I see the heading "Admin login"

  @admin
  Scenario: Admin logs in and out
    Given I open "/admin"
    When I log in as the dev admin
    Then I see the heading "Applications"
    And my session cookie is not readable by JavaScript
    When I press "Log out"
    Then I see the heading "Admin login"
    When I open "/admin"
    Then I see the heading "Admin login"

  Scenario: Wrong password is rejected
    Given I open "/admin/login"
    When I fill in "Email" with "admin@meowdoption.local"
    And I fill in "Password" with "definitely-not-it"
    And I press "Log in"
    Then I see the text "Incorrect email or password."
    And I see the heading "Admin login"

  Scenario: Too many wrong passwords block logging in for a while
    Given I open "/admin/login"
    When I enter a wrong password 5 times for a fresh email address
    And I try to log in once more
    Then I see the text "Too many failed login attempts. Try again in 15 minutes."
