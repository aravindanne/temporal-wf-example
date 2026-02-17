// Command dynamic-starter starts a dynamic workflow from a JSON definition file.
// Usage: go run ./cmd/dynamic-starter <definition.json> [input.json]
// If input.json is omitted, workflow input is {}.
package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"go.temporal.io/sdk/client"

	general "gosample/internal/workflows/general"
	"gosample/pkg/utils"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatalln("Usage: dynamic-starter <definition.json> [input.json]")
	}
	defPath := os.Args[1]
	inputPath := ""
	if len(os.Args) >= 3 {
		inputPath = os.Args[2]
	}

	defBytes, err := os.ReadFile(defPath)
	if err != nil {
		log.Fatalln("Read definition:", err)
	}

	var workflowInput interface{} = map[string]interface{}{}
	if inputPath != "" {
		inputBytes, err := os.ReadFile(inputPath)
		if err != nil {
			log.Fatalln("Read input:", err)
		}
		if err := json.Unmarshal(inputBytes, &workflowInput); err != nil {
			log.Fatalln("Parse input JSON:", err)
		}
	}

	c, err := client.Dial(client.Options{})
	if err != nil {
		log.Fatalln("Unable to create client", err)
	}
	defer c.Close()

	options := client.StartWorkflowOptions{
		ID:        "",
		TaskQueue: utils.GeneralTaskQueue,
	}

	input := general.DynamicWorkflowInput{
		Definition: defBytes,
		Input:      workflowInput,
	}

	we, err := c.ExecuteWorkflow(context.Background(), options, general.DynamicWorkflow, input)
	if err != nil {
		log.Fatalln("Unable to execute workflow", err)
	}
	log.Println("Started workflow", "WorkflowID", we.GetID(), "RunID", we.GetRunID())

	var result interface{}
	err = we.Get(context.Background(), &result)
	if err != nil {
		log.Fatalln("Unable to get workflow result", err)
	}
	log.Println("Workflow result:", result)
}
