# Workflow Editor (wf-ui)

Visual editor for building workflow JSON that runs in the gosample dynamic workflow engine.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

- **Left panel**: **Activities** – Validate Input, Process, Log Error, Greet, Send Email, Add to List (one block each). **Steps** – Condition, Signal. Drag any block onto the canvas to add a step.
- **Canvas**: Connect steps with edges. Use the correct handle for each branch:
  - **Activity**: "next" (top right), "onFailure" (bottom right)
  - **Condition**: "then" (top right), "else" (bottom right)
  - **Signal**: "next" (on signal), "timeout" (on timeout)
- **Right panel**: Select a node to edit its properties. For activities, the panel shows only that activity’s inputs (defined in its `*_activity.ts` file). Condition/Signal show operator, signal name, timeout, next/then/else steps, etc.
- **Export**: Use **Export JSON** or **Copy** in the header to generate gosample-compatible workflow JSON. Validation runs automatically; errors are shown in the header.

## Adding a new activity

1. **Register in gosample**: `RegisterNamedActivity("MyActivity", MyActivity)` in `internal/activities/general/activities.go`.

2. **Define the activity in the UI**: Create **`lib/activities/<name>_activity.ts`** (e.g. `add_to_list_activity.ts`) and export the activity definition, including the **inputs** that activity requests (only those fields will appear in the properties panel):

```ts
import type { ActivityDefinition } from "./types";

export const addToListActivity: ActivityDefinition = {
  name: "AddToList",
  label: "Add to List",
  description: "Add an item with email and name.",
  icon: "ListPlus",
  enabled: true,
  inputFields: [
    { key: "email", label: "Email", type: "text", placeholder: "user@example.com" },
    { key: "name", label: "Name", type: "text", placeholder: "Jane Doe" },
  ],
};
```

3. **Register in config**: In **`lib/activities/activitiesConfig.ts`**, import the activity and add it to the `ACTIVITIES_CONFIG` array.

4. If you use a new icon, add it to **`lib/activities/iconMap.tsx`**.

## Project structure

- **`app/`** – Next.js App Router (layout, page).
- **`components/`** – UI only: layout, palette, canvas (React Flow nodes), properties panel.
- **`lib/workflow/`** – Workflow types, build (flow → JSON), validation (mirrors gosample).
- **`lib/activities/`** – One file per activity (**`*_activity.ts`**) defining name, label, description, icon, enabled, and **inputFields** (the inputs that activity requests). **`activitiesConfig.ts`** imports all activity files and exports the list. **`iconMap.tsx`** maps icon names to Lucide components.
- **`lib/react-flow/`** – Node type registration for the canvas.
- **`hooks/`** – Canvas state (optional), export (build + validate + download/copy).
- **`contexts/`** – Workflow canvas state (nodes, edges, selection) shared by canvas, properties, and export.
- **`utils/`** – Step ID generation, ValueRef helpers.
- **`types/`** – Editor-specific types (node data, edge labels).

Exported JSON matches `gosample/internal/workflows/general` (version, startStepId, steps, activity/condition/signal, ValueRefs). Validation enforces startStepId when steps exist, no unreachable steps, no cycles, registered activity names, and signal timeout bounds.



5. to run the application.

- ** npm run dev **
