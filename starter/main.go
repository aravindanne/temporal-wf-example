package main

import (
	"context"
	example "gosample/internal/workflows/example"
	"gosample/pkg/utils"
	"log"
	"os"

	"go.temporal.io/sdk/client"
)

func main() {
	c, err := client.Dial(client.Options{})
	if err != nil {
		log.Fatalln("Unable to create client", err)
	}
	defer c.Close()

	options := client.StartWorkflowOptions{
		ID:        "greeting-workflow", //mention the ID name based on the use-case, if not, leave it empty
		TaskQueue: utils.InternalTaskQueue,
	}

	we, err := c.ExecuteWorkflow(context.Background(), options, example.SayHelloWorkflow, os.Args[1])
	if err != nil {
		log.Fatalln("Unable to execute workflow", err)
	}
	log.Println("Started workflow", "WorkflowID", we.GetID(), "RunID", we.GetRunID())

	var result string
	err = we.Get(context.Background(), &result)
	if err != nil {
		log.Fatalln("Unable get workflow result", err)
	}
	log.Println("Workflow result:", result)
}
