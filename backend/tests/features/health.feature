Feature: API health
  As an operator
  I want a health endpoint
  So that I can tell the API is up and connected to its database

  Scenario: Health check reports ok
    When I request the health endpoint
    Then the response status is 200
    And the API reports status "ok"
    And the database is reachable
