package general

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// ResolveValueRef resolves a ValueRef against workflow input and step results.
// stepResults maps stepId -> activity result (already unmarshaled as interface{}).
func ResolveValueRef(ref *ValueRef, workflowInput interface{}, stepResults map[string]interface{}) (interface{}, error) {
	if ref == nil {
		return nil, errors.New("ValueRef is nil")
	}
	switch ref.Type {
	case ValueRefLiteral:
		return ref.Value, nil
	case ValueRefInput:
		return getByPath(workflowInput, ref.Path), nil
	case ValueRefStepResult:
		result, ok := stepResults[ref.StepID]
		if !ok {
			return nil, fmt.Errorf("stepResult stepId %q was not executed (unavailable)", ref.StepID)
		}
		return getByPath(result, ref.Path), nil
	default:
		return nil, fmt.Errorf("unknown ValueRef type %q", ref.Type)
	}
}

// getByPath extracts a value from obj using a path. Path can be "$.a.b", "a.b", "$.items[0]", "items.0".
// Supports JSON object traversal and array indexing (segment "0"/"1" or "[0]"/"[1]").
func getByPath(obj interface{}, path string) interface{} {
	if path == "" || path == "$" {
		return obj
	}
	s := strings.TrimPrefix(path, "$.")
	if s == path && !strings.HasPrefix(path, "$") {
		s = path
	}
	parts := strings.Split(s, ".")
	for _, p := range parts {
		if p == "" {
			continue
		}
		// Strip optional brackets for array index e.g. "[0]" -> "0"
		segment := strings.TrimPrefix(strings.TrimSuffix(p, "]"), "[")

		switch v := obj.(type) {
		case map[string]interface{}:
			obj = v[p]
		case map[interface{}]interface{}:
			obj = v[p]
		case []interface{}:
			idx := parsePathIndex(segment)
			if idx < 0 || idx >= len(v) {
				return nil
			}
			obj = v[idx]
		default:
			return nil
		}
	}
	return obj
}

// parsePathIndex returns a non-negative index if segment is numeric, else -1.
func parsePathIndex(segment string) int {
	i, err := strconv.Atoi(segment)
	if err != nil || i < 0 {
		return -1
	}
	return i
}

// IsValueRef returns true if obj is a map with "type" equal to literal, input, or stepResult.
func IsValueRef(obj interface{}) bool {
	m, ok := obj.(map[string]interface{})
	if !ok {
		return false
	}
	t, _ := m["type"].(string)
	return t == ValueRefLiteral || t == ValueRefInput || t == ValueRefStepResult
}

// ValueRefFromMap builds a ValueRef from a map (e.g. from JSON decode).
func ValueRefFromMap(m map[string]interface{}) *ValueRef {
	if m == nil {
		return nil
	}
	t, _ := m["type"].(string)
	ref := &ValueRef{Type: t}
	if v, ok := m["value"]; ok {
		ref.Value = v
	}
	if p, ok := m["path"].(string); ok {
		ref.Path = p
	}
	if s, ok := m["stepId"].(string); ok {
		ref.StepID = s
	}
	return ref
}

// ResolveInput resolves activity input for a single step. The returned value is that step's
// input only and must not be shared with other activities; each activity receives only its
// own resolved payload. input can be a single ValueRef, a map of refs/literals, or a plain value.
// stepResults holds previous steps' outputs (not their inputs); stepResult refs use these.
func ResolveInput(input interface{}, workflowInput interface{}, stepResults map[string]interface{}) (interface{}, error) {
	if input == nil {
		return nil, nil
	}
	// Single ValueRef (object with type)
	if m, ok := input.(map[string]interface{}); ok && IsValueRef(m) {
		ref := ValueRefFromMap(m)
		return ResolveValueRef(ref, workflowInput, stepResults)
	}
	// Map: resolve each value recursively
	if m, ok := input.(map[string]interface{}); ok {
		out := make(map[string]interface{}, len(m))
		for k, v := range m {
			resolved, err := ResolveInput(v, workflowInput, stepResults)
			if err != nil {
				return nil, err
			}
			out[k] = resolved
		}
		return out, nil
	}
	// Plain value (number, string, bool, array, etc.)
	return input, nil
}

// EvaluateCondition evaluates a condition step. left/right are already resolved values.
func EvaluateCondition(left, right interface{}, operator string) (bool, error) {
	switch operator {
	case OpEq:
		return eq(left, right), nil
	case OpNe:
		return !eq(left, right), nil
	case OpGt:
		c, err := compare(left, right)
		return c > 0, err
	case OpGte:
		c, err := compare(left, right)
		return c >= 0, err
	case OpLt:
		c, err := compare(left, right)
		return c < 0, err
	case OpLte:
		c, err := compare(left, right)
		return c <= 0, err
	case OpExists:
		return exists(left), nil
	case OpIsEmpty:
		return isEmpty(left), nil
	case OpIn:
		return in(left, right), nil
	case OpNotIn:
		return !in(left, right), nil
	case OpContains:
		return contains(left, right), nil
	default:
		return false, fmt.Errorf("unknown operator %q", operator)
	}
}

func eq(a, b interface{}) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	// Normalize numbers for comparison
	af := toFloat(a)
	bf := toFloat(b)
	if af != nil && bf != nil {
		return *af == *bf
	}
	return fmt.Sprint(a) == fmt.Sprint(b)
}

func toFloat(v interface{}) *float64 {
	switch x := v.(type) {
	case float64:
		return &x
	case int:
		f := float64(x)
		return &f
	case int64:
		f := float64(x)
		return &f
	case string:
		f, err := strconv.ParseFloat(x, 64)
		if err != nil {
			return nil
		}
		return &f
	}
	return nil
}

func compare(a, b interface{}) (int, error) {
	af := toFloat(a)
	bf := toFloat(b)
	if af != nil && bf != nil {
		if *af < *bf {
			return -1, nil
		}
		if *af > *bf {
			return 1, nil
		}
		return 0, nil
	}
	sa, sb := fmt.Sprint(a), fmt.Sprint(b)
	if sa < sb {
		return -1, nil
	}
	if sa > sb {
		return 1, nil
	}
	return 0, nil
}

func exists(v interface{}) bool {
	if v == nil {
		return false
	}
	if s, ok := v.(string); ok && s == "" {
		return true
	}
	return true
}

func isEmpty(v interface{}) bool {
	if v == nil {
		return true
	}
	switch x := v.(type) {
	case string:
		return x == ""
	case map[string]interface{}:
		return len(x) == 0
	case []interface{}:
		return len(x) == 0
	}
	return false
}

func in(needle, haystack interface{}) bool {
	if haystack == nil {
		return false
	}
	arr, ok := haystack.([]interface{})
	if !ok {
		return false
	}
	for _, v := range arr {
		if eq(needle, v) {
			return true
		}
	}
	return false
}

func contains(haystack, needle interface{}) bool {
	if haystack == nil {
		return false
	}
	s, ok := haystack.(string)
	if ok {
		return strings.Contains(s, fmt.Sprint(needle))
	}
	arr, ok := haystack.([]interface{})
	if !ok {
		return false
	}
	for _, v := range arr {
		if eq(needle, v) {
			return true
		}
	}
	return false
}

// MarshalResult serializes an activity result for storage in step results.
func MarshalResult(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

// UnmarshalResult deserializes an activity result into interface{}.
func UnmarshalResult(data []byte) (interface{}, error) {
	var out interface{}
	err := json.Unmarshal(data, &out)
	return out, err
}
