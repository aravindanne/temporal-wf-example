package general

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
)

// NamedActivity is a function that runs an activity by name. Input and output are JSON-serialized.
type NamedActivity func(ctx context.Context, input []byte) ([]byte, error)

var (
	registry   = make(map[string]NamedActivity)
	registryMu sync.RWMutex
)

// RegisterNamedActivity registers an activity by name for use by the dynamic workflow.
func RegisterNamedActivity(name string, fn NamedActivity) {
	registryMu.Lock()
	defer registryMu.Unlock()
	registry[name] = fn
}

// GetRegisteredActivityNames returns all activity names registered for the dynamic workflow.
// Used by validation to reject unknown activity names at definition time.
func GetRegisteredActivityNames() []string {
	registryMu.RLock()
	defer registryMu.RUnlock()
	names := make([]string, 0, len(registry))
	for name := range registry {
		names = append(names, name)
	}
	return names
}

// IsActivityRegistered returns true if name is registered.
func IsActivityRegistered(name string) bool {
	registryMu.RLock()
	defer registryMu.RUnlock()
	_, ok := registry[name]
	return ok
}

// GetActivitiesForDynamicWorkflow returns Dispatch plus all activities registered by name.
// Use this in worker mappings so the list stays in sync with RegisterNamedActivity calls in init().
func GetActivitiesForDynamicWorkflow() []interface{} {
	registryMu.RLock()
	defer registryMu.RUnlock()
	out := make([]interface{}, 0, len(registry)+1)
	out = append(out, Dispatch)
	for _, fn := range registry {
		out = append(out, fn)
	}
	return out
}

// Dispatch executes an activity by name. Input is JSON bytes; output is JSON bytes.
// Used by the dynamic workflow as the single activity to call.
func Dispatch(ctx context.Context, name string, input []byte) ([]byte, error) {
	registryMu.RLock()
	fn, ok := registry[name]
	registryMu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("unknown activity name %q", name)
	}
	return fn(ctx, input)
}

// MustMarshalInput serializes activity input to JSON for Dispatch.
func MustMarshalInput(v interface{}) []byte {
	if v == nil {
		return []byte("null")
	}
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}
