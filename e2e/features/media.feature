Feature: Cat photos and meows
  As a visitor
  I want to see and hear the cats
  So that I can fall in love before I visit

  Scenario: Visitor hears the default meow of a cat without its own sound
    Given I open the cat "Luna"
    When I click the meow button for "Luna"
    Then a meow starts playing from "/media/default/meow.wav"

  Scenario: Admin uploads a photo and a meow, visitors see and hear them
    Given I am logged in as the dev admin
    And I have added a new cat
    When I upload a photo for that cat
    And I upload a meow for that cat
    And I open that cat's public page
    Then I see that cat's photo
    When I click the meow button for that cat
    Then a meow starts playing from "/media/sounds/"
