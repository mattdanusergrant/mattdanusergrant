# Metropolis Dawn Grid — Civic Automation Pitch

## One-line pitch

Bring the **feel** of Factorio and Satisfactory to Metropolis Dawn Grid without putting literal conveyor belts on the city map: players design industrial districts, freight roads, rail yards, warehouses, and utility corridors that make production chains readable as real civic infrastructure.

## North star

Metropolis Dawn Grid should still look like a plausible city. The player should read every logistics choice as something a mayor, planner, or civil engineer would actually build:

- arterial roads and truck routes,
- warehouses and loading docks,
- freight rail spurs and intermodal yards,
- industrial utility corridors,
- ports, depots, substations, and treatment plants,
- zoning adjacencies that create productive districts.

The Factorio/Satisfactory inspiration is not visual belts. It is the **systems feeling**: spotting a bottleneck, re-routing capacity, upgrading throughput, making a cleaner production district, and watching a once-starved chain start humming.

## Why this belongs in MDG

Metropolis Dawn Grid already has the right ingredients for city-scale automation:

- A hex-based build surface with one building per plot.
- Terrain-driven resource identity: forest, ore, water, and regional specializations.
- A visible supply chain: Works produce Materials, Factories produce Goods, Shops consume Goods, and Rail exports surplus.
- A shared-world premise where neighbors can be rich in resources your patch lacks.

The opportunity is to make the supply chain more **spatial**, **legible**, and **player-authored** while preserving the fantasy that a real city is functioning through roads, rail, utilities, and land use.

## Design goals

1. **City-builder first.** Automation should deepen zoning, roads, utilities, and rail; it should never turn the city into a belt factory.
2. **Infrastructure as logistics.** Every throughput tool should be a real-world civic asset: freight lane, warehouse, rail spur, yard, utility corridor, or service district.
3. **Readable bottlenecks.** If Ore is short, the player should see whether the problem is extraction, warehouse capacity, truck congestion, rail access, or factory demand.
4. **Small planning puzzles.** The fun should come from district layout and network capacity, not from threading conveyors through every tile.
5. **Async trade support.** Finished goods and specialty inputs should make neighbor relationships more valuable.
6. **Shippable simulation.** MVP should fit the zero-build vanilla JS prototype and avoid heavy per-packet pathfinding.

## Proposed feature set

### 1. Warehouses and loading docks

Warehouses replace the earlier depot/belt idea as the primary visible logistics node.

- **Raw Materials Yard:** stores Lumber, Grain, Ore, Stone, Oil, or Fish from nearby Works.
- **Factory Warehouse:** buffers inputs and finished Goods for adjacent factories.
- **Retail Distribution Center:** improves nearby Shops by smoothing Goods deliveries.
- **Intermodal Yard:** connects road freight to rail imports/exports.

Warehouses make production chains concrete without asking the player to draw non-city infrastructure across the map.

### 2. Freight road capacity

Roads become the believable equivalent of conveyor throughput.

- Industrial buildings generate freight demand.
- Roads have local freight capacity based on type, upgrades, and congestion.
- A **Freight Priority** upgrade marks an arterial as truck-friendly: higher industrial throughput, lower residential desirability.
- Overloaded links cause visible truck queues, slower factory output, and louder economy warnings.

This gives the player the Factorio-style “main bus” decision in a city language: which roads become freight arterials, and which streets stay civic/residential?

### 3. Rail spurs and intermodal yards

Rail remains the high-capacity backbone.

- Rail spurs connect industrial districts to the highway/world link.
- Intermodal Yards import missing resources from neighbors and export surplus Goods.
- Each yard has limited platform capacity, so late cities may need multiple yards or upgraded yards.
- Rail-adjacent factories get better output if a yard has the right input available.

The production fantasy becomes city-scale logistics: trucks handle local distribution; rail handles bulk movement and trade.

### 4. Utility corridors

Instead of visible conveyors, players can designate civic corridors that bundle infrastructure.

- A corridor follows road or rail infrastructure; it is not a standalone belt.
- It can carry industrial services such as power, water, waste, or bulk material priority.
- Corridors make dense industrial districts efficient but add maintenance costs and pollution/noise pressure.
- Corridor upgrades can unlock at later milestones: heavy freight, district steam, high-voltage, reclaimed water.

This preserves the map readability of a city while delivering the satisfaction of upgrading a production line.

### 5. Recipes as civic industries

Factories gain simple industry modes that match the existing resource model.

| Industry mode | Inputs | Output | City-readable fantasy |
| --- | --- | --- | --- |
| Construction Supply | Lumber + Stone | Goods | Building materials yard |
| Machine Works | Ore + Stone | Goods | Heavy manufacturing |
| Food Processing | Grain + Fish | Goods | Cold-chain food district |
| Petro-Electric | Oil + Ore | Power boost | Fuel and turbine service |
| Transit Fabrication | Ore + Lumber | Rail/transit bonus | Cars, parts, and trackwork |

Only one or two modes need to ship first. Additional modes can unlock by milestone, region, or trade relationship.

### 6. Bottleneck overlays

Add an economy overlay that highlights the weakest civic link in a chain.

- Red pulse: factory or shop waiting on input.
- Yellow pulse: warehouse full or loading dock blocked.
- Orange pulse: freight road over capacity.
- Green pulse: productive industrial flow.
- Blue pulse: rail import/export route active.

The existing economy modal can remain the numeric truth; the overlay makes the city explain those numbers.

### 7. District specialization bonuses

Industrial districts reward coherent planning.

- A Works cluster near a Raw Materials Yard becomes an extraction district.
- A Factory Warehouse plus factories becomes a manufacturing district.
- An Intermodal Yard plus rail spurs becomes a trade district.
- Shops near a Retail Distribution Center gain stable Goods access.

The player gets Satisfactory-style optimization satisfaction through zoning adjacency, infrastructure hierarchy, and capacity upgrades.

## MVP scope

Ship the smallest playable slice:

1. Add **Raw Materials Yard** and **Factory Warehouse** tools.
2. Let Works within a short road-connected radius feed a Raw Materials Yard.
3. Let Factories within a short road-connected radius draw from a Factory Warehouse.
4. Add a freight-capacity score to roads used by industrial buildings.
5. Give warehouse-fed Factories a clear production multiplier.
6. Add a logistics overlay showing productive warehouses, blocked warehouses, and freight-overloaded roads.
7. Keep the existing abstract economy as fallback so cities never hard-lock.

## Player experience

Early city:

1. Player zones housing, Shops, Works, and roads as usual.
2. The economy meter says Materials are short.
3. Player places a Raw Materials Yard near forest/ore Works and a Factory Warehouse in the industrial district.
4. The connecting road lights as a freight route; trucks and loading-dock pulses show the chain is working.
5. Factory output improves, Goods stock rises, and Shops grow faster.

Mid city:

1. Player discovers local land lacks Fish or Oil.
2. Player lays rail to the highway/world link.
3. Player places an Intermodal Yard near rail and selects a neighbor specialty import.
4. The imported resource appears as a blue rail-yard flow, then feeds a nearby industry mode.

Late city:

1. Player upgrades industrial arterials, rail yards, and utility corridors.
2. The city develops recognizable freight districts instead of spaghetti belts.
3. Surplus specialty goods export for cash, prestige, and shared-world identity.

## Balance knobs

- Warehouse storage capacity.
- Loading dock throughput.
- Freight road capacity by road type or upgrade.
- Congestion penalty from industrial traffic.
- Factory multiplier when warehouse-fed.
- Rail yard import/export platform capacity.
- Export price by industry mode.
- Maintenance, pollution, and desirability tradeoffs for freight corridors.
- Milestone gates for intermodal yards, heavy freight arterials, and advanced industry modes.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| The feature stops feeling like Factorio/Satisfactory | Preserve the loop of bottleneck diagnosis, capacity upgrades, input buffering, and satisfying flow feedback. |
| The map starts looking like conveyor spaghetti | Do not add literal belts; represent flow through roads, rail, warehouses, yards, and overlays. |
| The logistics model becomes too complex | Make warehouses optional bonuses first, not mandatory survival. |
| Simulation gets expensive on a 256×256 grid | Simulate district-level flow and cached road/rail connectivity, not individual item packets. |
| Players cannot debug routes | Add explicit overlay states for full warehouse, missing input, freight overload, and rail disconnected. |
| Freight upgrades harm city fantasy | Use real tradeoffs: noise, pollution, desirability, maintenance, and truck congestion. |

## Implementation notes

- Model logistics as **district-level throughput**, not item belts.
- Reuse existing road and rail connectivity checks where possible.
- Cache warehouse service areas and recompute only when roads, rail, warehouses, or participating buildings change.
- Use current resource IDs and economy structures so the modal, HUD, and balancing stay aligned.
- Persist warehouse/corridor upgrades in the existing city save payload with a versioned migration path.
- Visualize flow as trucks, loading pulses, rail-yard activity, and overlay color, not as moving conveyor items.

## Success criteria

- A new player can make one warehouse-fed industrial chain in under 60 seconds.
- The city still reads as a real place from a screenshot.
- The economy modal and overlay agree on whether the bottleneck is resource supply, freight capacity, warehouse capacity, or rail access.
- A warehouse-fed Factory feels meaningfully better than an unfed Factory.
- Rail-connected trade solves a missing-resource bottleneck in a way the player can see.
- The system creates the Factorio/Satisfactory feeling of diagnosing and improving throughput without using literal conveyor belts.

## Open questions

1. Should warehouses unlock before Factories, or at the same milestone?
2. Should Freight Priority be a road upgrade, a policy toggle, or both?
3. Should industrial truck traffic count directly toward the existing congestion meter?
4. Can players export raw resources, or only finished Goods and specialty products?
5. Should neighbor imports be player-selected, contract-driven, or automatic based on shortages?
6. Should utility corridors be purely a late-game upgrade, or an early way to clarify industrial districts?
