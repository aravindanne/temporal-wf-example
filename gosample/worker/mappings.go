package main

import (
	"reflect"

	greeting "gosample/internal/activities/example"
	generalActivities "gosample/internal/activities/general"
	example "gosample/internal/workflows/example"
	general "gosample/internal/workflows/general"
	"gosample/pkg/utils"
)

// WorkflowActivityConfig represents a workflow and its associated activities
// This defines the workflow-activity relationship once (no duplication)
type WorkflowActivityConfig struct {
	Workflow   interface{}
	Activities []interface{}
}

// WorkflowActivityMapping defines workflows and their activities
// Format: WF1 -> [activity1, activity2, activity3]
// Define each workflow-activity relationship ONCE here
var WorkflowActivityMapping = []WorkflowActivityConfig{
	{
		Workflow: example.SayHelloWorkflow,
		Activities: []interface{}{
			greeting.Greet,
		},
	},
	{
		Workflow:   general.DynamicWorkflow,
		Activities: generalActivities.GetActivitiesForDynamicWorkflow(),
	},
	// Add more workflows here:
	// {
	//     Workflow: AnotherWorkflow,
	//     Activities: []interface{}{
	//         activity1,
	//         activity2,
	//         activity3,
	//     },
	// },
}

// TaskQueueWorkflowMapping maps task queues to their workflows
// Format: taskQueue -> [workflow1, workflow2]
// Specify which workflows run on which task queues here
var TaskQueueWorkflowMapping = map[string][]interface{}{
	utils.InternalTaskQueue: {
		example.SayHelloWorkflow,
	},
	utils.GeneralTaskQueue: {
		general.DynamicWorkflow,
	},
	// Add more task queue mappings here:
	// utils.AnotherTaskQueue: {
	//     example.SayHelloWorkflow,
	//     example.AnotherWorkflow,
	// },
}

// GetAllTaskQueues returns a list of all unique task queue names from the mappings
func GetAllTaskQueues() []string {
	queues := make([]string, 0, len(TaskQueueWorkflowMapping))
	for queue := range TaskQueueWorkflowMapping {
		queues = append(queues, queue)
	}
	return queues
}

// GetWorkflowsForTaskQueue returns a list of workflows for a given task queue
func GetWorkflowsForTaskQueue(taskQueue string) []interface{} {
	if workflows, exists := TaskQueueWorkflowMapping[taskQueue]; exists {
		return workflows
	}
	return []interface{}{}
}

// GetActivitiesForWorkflow returns a list of activities for a given workflow
func GetActivitiesForWorkflow(workflow interface{}) []interface{} {
	workflowPtr := reflect.ValueOf(workflow).Pointer()
	for _, config := range WorkflowActivityMapping {
		configPtr := reflect.ValueOf(config.Workflow).Pointer()
		if workflowPtr == configPtr {
			return config.Activities
		}
	}
	return []interface{}{}
}
