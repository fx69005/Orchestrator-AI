# Orchestrator AI

Projet pédagogique pour construire progressivement un orchestrateur d’agents évolutif avec :

- NestJS et TypeScript pour l’application ;
- LangChain pour l’agent, le modèle et les outils ;
- LangGraph CLI et Studio pour lancer et observer l’agent ;
- LangSmith pour le tracing, activable progressivement.

Le suivi détaillé du parcours se trouve dans [`docs/PEDAGOGIE.md`](docs/PEDAGOGIE.md).

## Installation

```bash
npm install
Copy-Item .env.example .env
```

Renseigner au minimum `OPENAI_API_KEY` dans `.env` pour invoquer le modèle.

## Lancer NestJS

```bash
npm run start:dev
```

## Lancer l’agent dans LangGraph Studio

```bash
npm run langgraph:dev
```

Le serveur local expose l’agent déclaré dans `langgraph.json`. L’interface Studio permet ensuite de converser avec lui et d’observer ses exécutions.

## LangSmith

Le tracing est désactivé par défaut. Pour l’activer localement, renseigner dans `.env` :

```env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=...
LANGSMITH_PROJECT=orchestrator-ai
LANGSMITH_ENDPOINT=https://eu.api.smith.langchain.com
```

L’endpoint doit correspondre à la région du workspace LangSmith. Pour ce projet, le workspace utilisé répond sur l’endpoint EU.

## Vérifications

```bash
npm run build
npm test -- --runInBand
npm run lint
```

L’agent initial est volontairement créé avec `createAgent()` et aucun outil. Les nœuds LangGraph explicites seront introduits lorsque nous aurons besoin de contrôler précisément le routage.
