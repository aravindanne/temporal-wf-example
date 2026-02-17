package main

import (
	"log"
	"sync"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func main() {
	c, err := client.Dial(client.Options{})
	if err != nil {
		log.Fatalln("Unable to create client", err)
	}
	defer c.Close()

	var wg sync.WaitGroup

	taskQueues := GetAllTaskQueues()

	for _, taskQueue := range taskQueues {
		wg.Add(1)
		go func(queue string) {
			defer wg.Done()
			w := worker.New(c, queue, worker.Options{})

			// Register workflows and their activities from mappings
			workflows := GetWorkflowsForTaskQueue(queue)
			for _, workflow := range workflows {
				w.RegisterWorkflow(workflow)

				// Register activities for this workflow
				activities := GetActivitiesForWorkflow(workflow)
				for _, activity := range activities {
					w.RegisterActivity(activity)
				}
			}

			log.Println("Starting worker for", queue)
			err := w.Run(worker.InterruptCh())
			if err != nil {
				log.Fatalln("Unable to start worker for", queue, err)
			}
		}(taskQueue)
	}

	wg.Wait()
}
