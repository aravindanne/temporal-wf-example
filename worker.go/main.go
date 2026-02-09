package main

import (
	"log"

	greeting "gosample/internal/activities/example"
	example "gosample/internal/workflows/example"
	"gosample/pkg/utils"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func main() {
	c, err := client.Dial(client.Options{})
	if err != nil {
		log.Fatalln("Unable to create client", err)
	}
	defer c.Close()

	w := worker.New(c, utils.InternalTaskQueue, worker.Options{})

	w.RegisterWorkflow(example.SayHelloWorkflow)
	w.RegisterActivity(greeting.Greet)

	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("Unable to start worker", err)
	}
}
