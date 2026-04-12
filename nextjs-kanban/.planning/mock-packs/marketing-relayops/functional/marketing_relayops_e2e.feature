Feature: RelayOps marketing launch planning and execution

  Background:
    Given the RelayOps project exists in the MARKETING domain
    And the seven RelayOps planning documents are available
    And the planning thread starts in discovery

  Scenario: Happy path from planning to completed content briefs
    When the planner confirms the audience, primary message, KPI target, and launch window
    And the thread advances to task_mapping
    And the user runs Generate Tasks from Chat
    And the user moves "Draft 3 priority content briefs" from TODO to IN_PROGRESS
    And the user submits all three content brief files for review
    Then the project has seven generated tasks
    And "Draft 3 priority content briefs" reaches DONE

  Scenario: Missing launch brief blocks planning completion
    Given the launch brief file is missing
    When the user asks the planner to generate tasks
    Then the planner asks for the missing launch brief explicitly
    And the thread does not advance to task_mapping

  Scenario: Reviewer rejects incomplete content brief package
    Given "Draft 3 priority content briefs" is IN_PROGRESS
    When the user moves the task to IN_REVIEW with only one brief attached
    Then the reviewer rejects the task as incomplete
    And the task returns to IN_PROGRESS

  Scenario: Blocked KPI tracker is restored through the valid lifecycle
    Given "Define KPI tracker and reporting cadence" is BLOCKED
    When Maya confirms the source systems with Samir
    And the user restores the task to TODO
    And the user completes the remaining lifecycle steps
    Then the task reaches DONE with the KPI tracker spec present

  Scenario: Planning-side mutation updates the KPI task description
    Given the seven tasks already exist
    When Elena asks the planner to tighten the KPI task description
    And the planner proposes an update mutation for the existing KPI task
    And the user approves that mutation
    Then the KPI task description includes source systems and weekly reporting cadence
