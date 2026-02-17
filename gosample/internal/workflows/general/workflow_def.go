package general

// WorkflowDef is the top-level workflow definition parsed from JSON.
type WorkflowDef struct {
	Version      string             `json:"version"`
	StartStepID  *string            `json:"startStepId,omitempty"`
	Steps        map[string]StepDef `json:"steps"`
}

// StepDef is a single step (activity, condition, or signal). Type discriminates.
type StepDef struct {
	Type string `json:"type"`

	// Activity step fields
	Name              string      `json:"name,omitempty"`
	Input             interface{} `json:"input,omitempty"`
	NextStepID        *string     `json:"nextStepId,omitempty"`
	OnFailureStepID   *string     `json:"onFailureStepId,omitempty"`
	TimeoutSeconds    *int        `json:"timeoutSeconds,omitempty"`
	RetryPolicy       *RetryPolicy `json:"retryPolicy,omitempty"`

	// Condition step fields
	Left       *ValueRef `json:"left,omitempty"`
	Operator   string    `json:"operator,omitempty"`
	Right      *ValueRef `json:"right,omitempty"`
	ThenStepID *string   `json:"thenStepId,omitempty"`
	ElseStepID *string   `json:"elseStepId,omitempty"`

	// Signal step fields
	SignalName           string  `json:"signalName,omitempty"`
	SignalTimeoutSeconds int     `json:"signalTimeoutSeconds,omitempty"`
	TimeoutStepID        *string `json:"timeoutStepId,omitempty"`

	// Parallel step fields
	BranchStepIDs []string `json:"branchStepIds,omitempty"`
	Join          string   `json:"join,omitempty"` // "all" or "any"
}

// RetryPolicy for activity steps.
type RetryPolicy struct {
	MaximumAttempts        int     `json:"maximumAttempts,omitempty"`
	BackoffCoefficient     float64 `json:"backoffCoefficient,omitempty"`
	InitialIntervalSeconds int     `json:"initialIntervalSeconds,omitempty"`
	MaximumIntervalSeconds int     `json:"maximumIntervalSeconds,omitempty"`
}

// ValueRef is a reference or literal for condition operands and activity input.
// Type: "literal", "input", "stepResult".
type ValueRef struct {
	Type   string      `json:"type"`
	Value  interface{} `json:"value,omitempty"`
	Path   string      `json:"path,omitempty"`
	StepID string      `json:"stepId,omitempty"`
}

// Step types
const (
	StepTypeActivity  = "activity"
	StepTypeCondition = "condition"
	StepTypeSignal    = "signal"
	StepTypeParallel  = "parallel"
)

// Signal timeout bounds (production-grade: bounded wait).
const (
	MinSignalTimeoutSeconds = 1
	MaxSignalTimeoutSeconds = 31536000 // 1 year
)

// SignalTimeoutResultKey is the key set in step result when signal step times out.
const SignalTimeoutResultKey = "_timeout"

// ActivityErrorResultKey is the key set in step result when activity fails and onFailureStepId is used.
const ActivityErrorResultKey = "_error"

// SupportedDefinitionVersions lists definition versions the engine accepts.
var SupportedDefinitionVersions = map[string]bool{"1.0": true}

// ValueRef types
const (
	ValueRefLiteral    = "literal"
	ValueRefInput      = "input"
	ValueRefStepResult = "stepResult"
)

// Condition operators
const (
	OpEq       = "eq"
	OpNe       = "ne"
	OpGt       = "gt"
	OpGte      = "gte"
	OpLt       = "lt"
	OpLte      = "lte"
	OpIn       = "in"
	OpNotIn    = "notIn"
	OpExists   = "exists"
	OpIsEmpty  = "isEmpty"
	OpContains = "contains"
)

// ValidConditionOperators is the set of allowed condition operators.
var ValidConditionOperators = map[string]bool{
	OpEq: true, OpNe: true, OpGt: true, OpGte: true, OpLt: true, OpLte: true,
	OpIn: true, OpNotIn: true, OpExists: true, OpIsEmpty: true, OpContains: true,
}

// Parallel join strategies
const (
	JoinAll = "all"
	JoinAny = "any"
)

// ValidJoinStrategies is the set of allowed parallel join strategies.
var ValidJoinStrategies = map[string]bool{
	JoinAll: true,
	JoinAny: true,
}
