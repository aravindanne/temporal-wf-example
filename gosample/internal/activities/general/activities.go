package general

import (
	"context"
	"encoding/json"
)

func init() {
	RegisterNamedActivity("ValidateInput", ValidateInput)
	RegisterNamedActivity("Process", Process)
	RegisterNamedActivity("LogError", LogError)
	RegisterNamedActivity("Greet", GreetBytes)
	RegisterNamedActivity("SendEmail", SendEmail)
}

// ValidateInput accepts JSON input and returns {"valid": true/false, "error": "..."}.
// Input can be any JSON; if it has "skipValidate": true, returns valid false with error.
func ValidateInput(ctx context.Context, input []byte) ([]byte, error) {
	var in map[string]interface{}
	if len(input) > 0 && string(input) != "null" {
		if err := json.Unmarshal(input, &in); err != nil {
			return nil, err
		}
	}
	if in == nil {
		in = make(map[string]interface{})
	}
	out := map[string]interface{}{"valid": true}
	if skip, _ := in["skipValidate"].(bool); skip {
		out["valid"] = false
		out["error"] = "validation skipped by input"
	}
	return json.Marshal(out)
}

// Process accepts JSON (e.g. from ValidateInput) and returns {"processed": true}.
func Process(ctx context.Context, input []byte) ([]byte, error) {
	out := map[string]interface{}{"processed": true}
	return json.Marshal(out)
}

// LogError accepts JSON with "error" field and returns {"logged": true}.
func LogError(ctx context.Context, input []byte) ([]byte, error) {
	out := map[string]interface{}{"logged": true}
	return json.Marshal(out)
}

// SendEmail is a stub for async email: returns {"sent": true}. Real outcome (delivered/opened/clicked) comes via signal.
func SendEmail(ctx context.Context, input []byte) ([]byte, error) {
	out := map[string]interface{}{"sent": true}
	return json.Marshal(out)
}

// GreetBytes wraps the example Greet activity: input JSON {"name": "..."}, output JSON string.
func GreetBytes(ctx context.Context, input []byte) ([]byte, error) {
	var in struct {
		Name string `json:"name"`
	}
	if len(input) > 0 && string(input) != "null" {
		if err := json.Unmarshal(input, &in); err != nil {
			return nil, err
		}
	}
	// Use example.Greet by importing and calling - but that would create a circular dependency
	// if example imports general. So we implement a simple greeting here for the dynamic flow.
	greeting := "Hello " + in.Name
	if in.Name == "" {
		greeting = "Hello World"
	}
	return json.Marshal(greeting)
}
