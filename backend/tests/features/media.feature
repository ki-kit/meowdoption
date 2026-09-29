Feature: Cat photos and meows
  As a shelter admin
  I want to upload photos and meow sounds for each cat
  So that visitors can see and hear them

  Background:
    Given the following cats exist:
      | name  | sex    | age_months |
      | Micka | female | 6          |
    And I am logged in as an admin

  # --- Photos ------------------------------------------------------------------

  Scenario: Upload a PNG photo
    When I upload a 2400x1200 PNG photo for "Micka"
    Then the response status is 201
    And the photo is stored as WebP no larger than 1600 pixels
    And "Micka" shows that photo as primary publicly

  Scenario: Uploaded photos lose their metadata
    When I upload a JPEG photo with GPS metadata for "Micka"
    Then the response status is 201
    And the stored photo has no metadata

  Scenario: Upside-down phone photos are turned the right way up
    When I upload a 200x100 JPEG photo tagged "rotate 90°" for "Micka"
    Then the stored photo is 100x200

  Scenario Outline: Files that aren't real images are rejected
    When I upload <file> as a photo for "Micka"
    Then the response status is 422
    And "Micka" has no photos

    Examples:
      | file                          |
      | a text file named "cat.png"   |
      | a truncated PNG               |
      | an SVG image                  |

  Scenario: Oversized photos are rejected
    When I upload a photo larger than 5 MB for "Micka"
    Then the response status is 413

  Scenario: The first photo is primary, later ones aren't
    When I upload 2 photos for "Micka"
    Then "Micka" has 2 photos and only the first is primary

  Scenario: Choose another primary photo
    Given "Micka" has 2 photos
    When I make the second photo primary
    Then the response status is 200
    And "Micka" has 2 photos and only the second is primary

  Scenario: Deleting the primary photo promotes the next one
    Given "Micka" has 2 photos
    When I delete the first photo
    Then the response status is 204
    And "Micka" has 1 photo and it is primary
    And the first photo's file is gone

  Scenario: Photo limit per cat
    Given "Micka" has 10 photos
    When I upload 1 photos for "Micka"
    Then the response status is 409

  # --- Sounds ------------------------------------------------------------------

  Scenario: Upload a meow
    When I upload a 0.5 second WAV meow for "Micka"
    Then the response status is 201
    And the sound's duration is about 0.5 seconds

  Scenario: An .exe renamed to .mp3 is rejected
    When I upload an executable renamed to "meow.mp3" as a sound for "Micka"
    Then the response status is 422
    And "Micka" has no sounds

  Scenario: Oversized sounds are rejected
    When I upload a sound larger than 1 MB for "Micka"
    Then the response status is 413

  Scenario: Visitors get the chosen primary meow
    Given "Micka" has 2 sounds
    When I make the second sound primary
    Then the response status is 200
    And visitors get the second sound as "Micka"'s meow

  Scenario: A cat without sounds gets the default meow
    Then visitors get the default meow for "Micka"

  Scenario: Deleting a sound removes its file
    Given "Micka" has 2 sounds
    When I delete the first sound
    Then the response status is 204
    And the first sound's file is gone
    And visitors get the second sound as "Micka"'s meow

  # --- Cleanup & access --------------------------------------------------------

  Scenario: Deleting a cat removes its files
    Given "Micka" has 2 photos
    And "Micka" has 2 sounds
    When I delete "Micka"
    Then the response status is 204
    And no media files are left

  Scenario: Uploading for an unknown cat
    When I upload 1 photos for cat 999999
    Then the response status is 404
