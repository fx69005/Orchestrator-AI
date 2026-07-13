# Parcours pédagogique — Orchestrator AI

## Objectif

Construire progressivement un orchestrateur d’agents évolutif en comprenant chaque couche avant d’ajouter la suivante.

Le projet commence volontairement par une seule verticale fonctionnelle : un agent LangChain observable dans LangGraph Studio. Les architectures multi-agents, la mémoire externe et l’autonomie avancée restent hors périmètre jusqu’à ce que les bases soient maîtrisées.

## Stack

- NestJS et TypeScript : application et intégration ;
- LangChain : modèle, agent et outils ;
- LangGraph : runtime et orchestration explicite lorsque nécessaire ;
- LangGraph CLI / Studio : serveur local, visualisation et interaction ;
- LangSmith : tracing et observabilité progressive.

## Progression

- [x] 1. Comprendre les rôles d’un agent, d’un orchestrateur, de LangChain et de LangGraph Studio.
- [ ] 2. Comprendre l’état d’exécution et le cycle d’un agent LangChain.
- [x] 3. Ajouter une mémoire interne de conversation.
- [ ] 4. Ajouter un premier outil contrôlé.
- [ ] 5. Ajouter des décisions conditionnelles et des boucles.
- [ ] 6. Intégrer proprement l’agent dans NestJS.
- [ ] 7. Activer puis étudier le tracing et l’évaluation avec LangSmith.
- [ ] 8. Introduire des graphes LangGraph explicites pour les orchestrations avancées.

## Point 1 — Comprendre l’architecture actuelle

Statut : validé.

Acquis :

- le modèle et le prompt système sont configurés dans `src/agent/agent.ts` ;
- `createAgent()` crée l’agent LangChain et encapsule le runtime LangGraph ;
- `langgraph.json` indique au CLI où trouver l’export `agent` ;
- `AgentService` est l’adaptateur NestJS qui appelle `agent.invoke()` ;
- le CLI lance le serveur local et Studio permet d’observer l’agent.

## Point 2 — État d’exécution

Statut : validé.

Concepts à comprendre :

- l’entrée de l’agent est un objet contenant notamment `messages` ;
- un `run` est une exécution de l’agent ;
- un `thread` regroupe plusieurs runs d’une même conversation ;
- un `checkpoint` est une photographie de l’état sauvegardée dans un thread ;
- lors d’un appel direct via `AgentService.invoke()`, nous ne fournissons pas encore de `thread_id` ni de checkpointer ;
- dans LangGraph Studio, l’Agent Server gère les threads et les checkpoints pour l’expérience locale ;
- la réponse de l’agent est un objet d’état, pas seulement une chaîne de caractères.

LangChain décrit `messages` comme une partie centrale de l’état de tous les agents. LangGraph utilise ensuite les threads et les checkpoints pour conserver cet état entre plusieurs interactions.

### Expérience 2.1 — Observer l’état dans Studio

1. Lancer `npm run langgraph:dev`.
2. Créer un nouveau thread `A`.
3. Envoyer : `Je m’appelle Alice.`
4. Dans le même thread, envoyer : `Quel est mon prénom ?`
5. Créer un nouveau thread `B`.
6. Envoyer : `Quel est mon prénom ?`

Observer la différence : le thread `A` représente une suite de runs pouvant partager l’état de conversation ; le thread `B` démarre une nouvelle conversation.

Cette expérience ne constitue pas encore notre mémoire applicative finale. Elle sert à comprendre le mécanisme d’exécution avant d’ajouter explicitement la mémoire interne dans le code.

### Observation réalisée

L’état du serveur a confirmé le comportement attendu :

- le thread contenant « Alice » possède 4 messages, soit 2 tours `human → ai` ;
- les autres threads possèdent 2 messages et ne contiennent pas « Alice » ;
- la continuité de contexte est donc liée au thread, et non partagée entre tous les threads.

Un `turn` correspond à un échange utilisateur → agent. Plusieurs tours peuvent appartenir au même thread.

### Trace et thread

Une trace représente l’exécution détaillée d’un run : modèle, étapes internes, outils éventuels, durée et résultat.

Un thread représente la conversation dans laquelle plusieurs runs peuvent être regroupés.

| Élément observé | Signification |
| --- | --- |
| 1 thread | 1 conversation persistante |
| 2 traces | 2 exécutions ou 2 tours dans cette conversation |
| 4 messages | généralement 2 messages utilisateur et 2 réponses agent |

Ainsi, voir 2 traces dans 1 thread est le comportement attendu : chaque nouveau message peut produire une nouvelle trace tout en réutilisant l’état du même thread.

### Clarification — agent sans mémoire versus serveur avec mémoire

Notre code `createAgent()` ne contient pas encore de mémoire applicative explicite :

- `agent.invoke({ messages })` reçoit l’état qu’on lui transmet ;
- `AgentService.invoke()` ne fournit pas encore de `thread_id` ni de stockage de conversation ;
- une invocation directe depuis NestJS doit donc être considérée comme indépendante.

En revanche, quand l’agent est lancé par l’Agent Server et utilisé dans Studio, le serveur gère automatiquement les threads et les checkpoints. C’est cette couche qui permet au deuxième run du même thread de récupérer l’état du premier.

LangSmith ne fournit pas cette mémoire : il enregistre et regroupe les traces pour l’observabilité. La mémoire et le tracing sont deux mécanismes différents.

La mémoire interne que nous construirons ensuite servira à comprendre et contrôler explicitement ce mécanisme dans notre code, au lieu de dépendre uniquement du comportement automatique du serveur de développement.

### Activité 2.2 — Lire l’état d’un run

Dans `AgentService`, l’état initial transmis à l’agent est construit ainsi :

```ts
{
  messages: [
    { role: 'user', content: message },
  ],
}
```

Pendant l’exécution, l’agent ajoute sa réponse dans `messages`. Dans un même thread, le run suivant reçoit l’état de la conversation précédente puis ajoute le nouveau message utilisateur.

À observer dans Studio :

1. ouvrir la première trace ;
2. regarder ses entrées et sa sortie ;
3. ouvrir la deuxième trace du même thread ;
4. comparer les messages disponibles au début du deuxième run.

Question de validation : le modèle possède-t-il une mémoire cachée, ou reçoit-il simplement un historique de messages dans son état ?

### Validation 2.2

Réponse validée : le modèle reçoit l’historique des messages dans son état. Il ne conserve pas seul une mémoire persistante entre deux runs.

## Point 3 — Mémoire interne de conversation

Statut : en cours.

Objectif : remplacer la dépendance implicite au serveur de développement par une mémoire interne contrôlée dans le code.

Concepts à étudier :

- `thread_id` comme identifiant de conversation ;
- checkpointer comme mécanisme de sauvegarde d’état ;
- mémoire en processus pour l’apprentissage ;
- limites d’une mémoire qui disparaît au redémarrage ;
- différence entre mémoire de conversation et mémoire long terme.

Première implémentation choisie : `MemorySaver` de LangGraph. Il conserve l’état en mémoire du processus et utilise `thread_id` pour séparer les conversations.

Dans notre code :

```ts
const internalMemory = new MemorySaver();

const agent = createAgent({
  model,
  tools: [],
  checkpointer: internalMemory,
});
```

L’invocation doit maintenant fournir un identifiant de thread :

```ts
agent.invoke(
  { messages: [{ role: 'user', content: message }] },
  { configurable: { thread_id: threadId } },
);
```

Limite volontaire : cette mémoire disparaît au redémarrage du processus. Nous étudierons plus tard une mémoire persistante.

Prochaine activité : vérifier que deux messages avec le même `thread_id` partagent leur historique, tandis que deux `thread_id` différents restent isolés.

Vérifications techniques réalisées :

- compilation TypeScript réussie ;
- tests NestJS réussis ;
- lint réussi ;
- serveur LangGraph démarré avec le graphe `agent` ;
- endpoint local `/ok` retournant `200`.

Règle de redémarrage :

- après une modification de `agent.ts`, du `langgraph.json` ou du `.env`, relancer `npm run langgraph:dev` ;
- relancer NestJS uniquement lorsqu’on teste directement `AgentService` ou une future API NestJS.

### Test 3.1 — Même thread versus nouveau thread

1. Relancer `npm run langgraph:dev`.
2. Ouvrir l’URL Studio affichée par le serveur et sélectionner `agent`.
3. Créer le thread `A`.
4. Envoyer : `Je m’appelle Alice. Garde cette information pour la suite.`
5. Dans le même thread `A`, envoyer : `En te basant uniquement sur cette conversation, quel est mon prénom ?`
6. Créer un nouveau thread `B`.
7. Envoyer la même question dans le thread `B`.

Résultat attendu :

- le thread `A` peut répondre `Alice` ;
- le thread `B` ne possède pas le message contenant Alice et devrait indiquer qu’il ne connaît pas le prénom ;
- le thread `A` contient deux runs/traces, tandis que le thread `B` démarre une nouvelle conversation.

Dans Studio, vérifier également que les messages précédents apparaissent dans l’état du thread `A`, mais pas dans celui du thread `B`.

### Validation 3.1

Le test est réussi :

- le thread `A` retrouve le prénom Alice ;
- le thread `B` ne connaît pas le prénom ;
- la mémoire est isolée par `thread_id`.

Le point 3 est terminé. Le prochain objectif est d’ajouter un outil simple et contrôlé afin d’observer le cycle `agent → outil → agent`.

## Méthode de travail

À chaque point :

1. expliquer le concept ;
2. observer le code existant ;
3. réaliser une petite modification ou expérience ;
4. vérifier le résultat avec un test, le CLI ou Studio ;
5. mettre à jour ce fichier.
