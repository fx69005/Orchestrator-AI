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

## Orchestrateur financier V2

Le graphe `financialGraph` combine LangGraph et LangChain :

- politique de sécurité déterministe ;
- classifieur Safety LLM structuré ;
- Supervisor financier LangChain ;
- sous-agents `account`, `budget` et `investment` appelés comme tools ;
- tools de lecture mockés, sans MCP ni donnée financière réelle.

Les montants retournés sont fixes et explicitement simulés. Une décision `unsafe` ou
`uncertain` arrête le flux avant le Supervisor et les sous-agents.

L’API correspondante est `POST /agent/financial/invoke` :

```json
{
  "message": "Quel est mon budget alimentation ?",
  "threadId": "thread-financial"
}
```

Le graphe retourne notamment `intent`, `safe`, `safetyDecision`, `selectedAgent`,
`delegatedAgents`, `response` et `messages`.

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

## Évaluation LangSmith du graphe financier

Après avoir créé le dataset `orchestrator-ai-financial-v2` et démarré NestJS :

```bash
npm run eval:langsmith:financial
```

Le runner appelle `/agent/financial/invoke` et évalue la décision Safety, le domaine
primaire, les sous-agents délégués et la réponse finale.

L’agent initial créé avec `createAgent()` reste disponible pour les exercices de base.
`routingGraph` et `financialGraph` montrent les deux formes de contrôle explicite
avec LangGraph.
