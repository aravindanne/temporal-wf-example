package example

import (
	"time"

	example "gosample/internal/activities/example"

	"go.temporal.io/sdk/workflow"
)

func SayHelloWorkflow(ctx workflow.Context, name string) (string, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: time.Second * 10,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result string
	err := workflow.ExecuteActivity(ctx, example.Greet, name).Get(ctx, &result)
	if err != nil {
		return "", err
	}

	return result, nil
}
