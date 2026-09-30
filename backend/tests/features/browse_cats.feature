Feature: Browse cats
  As a visitor
  I want to browse and filter cats up for adoption
  So that I can find a cat that fits my home

  Background:
    Given the following cats exist:
      | name     | sex    | age_months | breed      | castrated | status    | good_with_kids |
      | Mourek   | male   | 24         | European   | true      | available | true           |
      | Micka    | female | 6          | Siamese    | false     | available | true           |
      | Líza     | female | 60         | European   | true      | pending   | false          |
      | Garfield | male   | 120        | Persian    | false     | adopted   | false          |

  Scenario: List all cats
    When I list cats
    Then the response status is 200
    And the total is 4
    And I see the cats "Mourek, Micka, Líza, Garfield"

  Scenario: Filter by sex
    When I list cats with "sex=female"
    Then I see the cats "Micka, Líza"

  Scenario: Filter by castrated
    When I list cats with "castrated=true"
    Then I see the cats "Mourek, Líza"

  Scenario: Combine filters
    When I list cats with "sex=female&castrated=true"
    Then I see the cats "Líza"

  Scenario: Filter by status
    When I list cats with "status=available"
    Then I see the cats "Mourek, Micka"

  Scenario: Filter by age range
    When I list cats with "min_age_months=12&max_age_months=60"
    Then I see the cats "Mourek, Líza"

  Scenario: Filter by breed ignores case
    When I list cats with "breed=european"
    Then I see the cats "Mourek, Líza"

  Scenario: Paginate results
    When I list cats with "page=2&size=3"
    Then the total is 4
    And I see 1 cat on the page

  Scenario: View cat detail
    When I view the cat "Micka"
    Then the response status is 200
    And the cat's breed is "Siamese"
    And the cat is not castrated

  Scenario: Unknown cat
    When I view a cat that does not exist
    Then the response status is 404

  Scenario: Cats are only served under the versioned API
    When I request "/api/cats"
    Then the response status is 404

  Scenario: Invalid filter value is rejected
    When I list cats with "sex=dragon"
    Then the response status is 422
