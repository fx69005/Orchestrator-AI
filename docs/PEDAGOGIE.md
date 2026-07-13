# Parcours pédagogique — Orchestrator AI

## Objectif

Construire progressivement un orchestrateur d’agents évolutif en comprenant chaque couche avant d’ajouter la suivante.

Le projet commence volontairement par une seule verticale fonctionnelle : un agent LangChain observable dans LangGraph Studio. Les architectures multi-agents, la mémoire externe et l’autonomie avancée restent hors périmètre jusqu’à ce que les bases soient maîtrisées.

## Stack

- NestJS et TypeScript : application et intégration ;
- LangChain : modèle, agent et outils ;
- LangGraph : runtime et orchestration explicite lorsque nécessaire ;
- LangGraph CLI / Studio : serveur local, visualisation et interaction ;
- LangSmith : tracing et observabilité progressive ;
- `@langchain/mcp-adapters` : consommation future d’outils exposés par des serveurs MCP.

## Préparation MCP

La dépendance officielle `@langchain/mcp-adapters@1.1.3` est installée.

Elle permettra d’utiliser `MultiServerMCPClient`, de charger des outils MCP avec
`client.getTools()`, puis de les fournir à `createAgent({ tools })`. Nous ne
l’intégrons pas encore dans l’agent : cette installation prépare une prochaine
étape pédagogique dédiée aux transports `stdio` et HTTP.

Le package `@modelcontextprotocol/sdk` n’est pas ajouté comme dépendance directe. Il
est nécessaire uniquement lorsque nous créerons notre propre serveur MCP, et non
pour consommer un serveur existant. L’adaptateur installé le fournit actuellement
comme dépendance transitive.

Référence officielle : [Model Context Protocol — LangChain JavaScript](https://docs.langchain.com/oss/javascript/langchain/mcp).

## Progression

- [x] 1. Comprendre les rôles d’un agent, d’un orchestrateur, de LangChain et de LangGraph Studio.
- [ ] 2. Comprendre l’état d’exécution et le cycle d’un agent LangChain.
- [x] 3. Ajouter une mémoire interne de conversation.
- [x] 4. Ajouter un premier outil contrôlé.
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

### Configurable, context et metadata

`configurable` n’est pas une mémoire en soi. C’est la zone de configuration runtime prévue par LangGraph.

- `configurable.thread_id` : identifie la conversation utilisée par le checkpointer ; c’est le choix actuel pour notre mémoire interne.
- `configurable.checkpoint_id` : permet de cibler un checkpoint précis ; usage avancé pour l’historique et le time travel.
- `context` : transporte des données de la requête comme `userId`, `tenantId` ou `locale` ; ces données ne remplacent pas l’état persistant de la conversation.
- `metadata` et `tags` : enrichissent les traces LangSmith ; ils servent à l’observabilité, pas à fournir l’historique au modèle.

Notre application peut utiliser un nom métier comme `conversationId`, mais elle devra le mapper vers `configurable.thread_id` pour que le checkpointer LangGraph retrouve l’état.

## Point 4 — Premier outil contrôlé

Statut : validé.

Un outil possède quatre éléments :

- un nom stable (`add_numbers`) ;
- une description que le modèle peut comprendre ;
- un schéma d’entrée validé avec Zod ;
- une fonction TypeScript qui exécute réellement l’action.

Notre premier outil additionne deux nombres. Il est volontairement local, déterministe et sans effet externe.

Le cycle attendu est :

```text
message utilisateur
        ↓
agent décide d’utiliser add_numbers
        ↓
LangChain valide left et right
        ↓
TypeScript calcule le résultat
        ↓
agent formule la réponse finale
```

Vérifications techniques :

- `math.tool.spec.ts` teste l’outil directement, sans modèle ni réseau ;
- compilation TypeScript réussie ;
- 2 suites de tests réussies ;
- lint réussi ;
- serveur LangGraph démarré avec le graphe contenant l’outil.

Prochaine activité : invoquer l’agent dans Studio avec une addition et observer l’appel de l’outil dans la trace.

### Validation 4.1

Le test Studio est réussi :

- l’agent décide d’appeler `add_numbers` ;
- les arguments sont transmis selon le schéma Zod ;
- la fonction TypeScript calcule le résultat ;
- le résultat de l’outil est réinjecté dans le cycle de l’agent ;
- l’agent produit la réponse finale.

Le point 4 est terminé. Le prochain objectif est d’introduire un routage conditionnel et de comprendre quand l’agent s’arrête ou poursuit son cycle.

### Le prompt impose-t-il l’utilisation de l’outil ?

Non. La phrase `Pour toute addition, utilise toujours l’outil add_numbers` est une consigne souple destinée à guider le modèle et à rendre la démonstration reproductible.

L’agent connaît déjà l’outil grâce à :

- son nom ;
- sa description ;
- son schéma Zod ;
- sa présence dans la liste `tools`.

Sans cette phrase, le modèle peut choisir d’appeler l’outil, mais il peut aussi calculer directement la réponse. Le prompt ne constitue donc pas une garantie technique.

Pour garantir l’utilisation d’un outil, il faudra plus tard utiliser une règle d’orchestration explicite, un middleware, une validation du résultat ou un graphe conditionnel. Pour une action sensible ou avec effet externe, il ne faudra pas dépendre uniquement du prompt.

## Point 5 — Décision conditionnelle et boucle

Statut : en cours.

### 5.1 — La boucle implicite de `createAgent()`

Notre agent possède déjà une boucle interne :

```text
message utilisateur
        ↓
modèle
        ↓
réponse finale ? ── oui ──→ fin du run
        │
        non : appel d’outil
        ↓
outil
        ↓
résultat ajouté à l’état
        ↓
modèle à nouveau
```

La décision actuelle est prise par le modèle. Nous n’avons pas encore écrit de routeur TypeScript qui impose le chemin d’exécution.

### Expérience 5.1 — Comparer deux chemins

Dans deux threads distincts de Studio :

1. envoyer `Bonjour, présente-toi simplement.` ;
2. envoyer `Calcule 12 + 30 en utilisant add_numbers.`

Comparer les traces :

- la première demande peut aller directement vers une réponse finale ;
- la deuxième doit passer par `add_numbers`, puis revenir au modèle pour formuler la réponse ;
- le nombre d’étapes varie selon la décision prise par l’agent.

Question de validation : qui décide actuellement d’appeler l’outil, et qu’est-ce qui indique à l’agent qu’il peut terminer son run ?

### Validation 5.1

Les réponses sont correctes avec une nuance importante :

- le modèle, guidé par le prompt et la liste des outils disponibles, décide d’émettre un appel d’outil ;
- le runtime LangChain exécute ensuite l’outil et réinjecte son résultat dans l’état ;
- après ce résultat, le modèle peut soit produire la réponse finale, soit demander un autre outil ;
- le run se termine lorsque le modèle produit une réponse finale sans nouvel appel d’outil, ou lorsqu’une limite d’exécution est atteinte.

Les chemins observés sont cohérents :

- demande simple : message utilisateur → réponse du modèle ;
- demande avec addition : message utilisateur → décision du modèle → `add_numbers` → résultat de l’outil → réponse finale du modèle.

La visualisation peut afficher ces éléments comme des étapes ou comme des runs imbriqués dans une trace.

### 5.2 — Décision implicite versus décision explicite

La décision actuelle est implicite :

```text
message + outils disponibles + prompt
                    ↓
              décision du modèle
```

Une décision explicite serait contrôlée par notre code :

```text
message utilisateur
        ↓
routeur TypeScript
        ├── conversation
        └── calcul
```

Exemple de contrat possible :

```ts
type RequestRoute = 'conversation' | 'calculation';
```

Le routeur ne devrait pas exécuter toute l’orchestration. Il devrait seulement choisir une route claire, puis déléguer l’exécution au composant approprié.

### Exercice 5.2 — Concevoir la règle de routage

Classer mentalement les demandes suivantes :

- `Bonjour, explique-moi ton rôle.` → `conversation` ;
- `Calcule 12 + 30.` → `calculation` ;
- `Pourquoi utilise-t-on une mémoire par thread ?` → `conversation` ;
- `Additionne 8 et 5 avec l’outil.` → `calculation`.

Avant d’écrire le routeur, il faut être capable de décrire sa règle et ses limites. Une règle basée uniquement sur quelques mots-clés sera utile pour apprendre, mais insuffisante pour un système général.

### Correction 5.2

`Implicite` et `explicite` ne classent pas les phrases utilisateur. Ils indiquent qui prend la décision :

- dans notre code actuel, les quatre demandes sont traitées implicitement, car le modèle choisit lui-même la réponse ou l’appel d’outil ;
- avec un routeur TypeScript, les quatre demandes pourraient être traitées explicitement selon leur catégorie.

Le classement attendu serait :

- `Bonjour, explique-moi ton rôle.` → `conversation` ;
- `Calcule 12 + 30.` → `calculation` ;
- `Pourquoi utilise-t-on une mémoire par thread ?` → `conversation` ;
- `Additionne 8 et 5 avec l’outil.` → `calculation`.

Même la phrase `Additionne 8 et 5 avec l’outil` reste une décision implicite tant que c’est le modèle qui interprète la demande et choisit l’outil.

### 5.3 — Premier routeur explicite

Nous avons ajouté `routeRequest()` dans `src/agent/routing/request-router.ts`.

Il retourne une valeur fermée :

```ts
type RequestRoute = 'conversation' | 'calculation';
```

La règle actuelle est volontairement simple : certains marqueurs comme `calcule`, `additionne` ou `somme` orientent vers `calculation`; le reste va vers `conversation`.

Le routeur est testé indépendamment dans `request-router.spec.ts`. Il ne contrôle pas encore l’exécution de l’agent : cette séparation nous permet d’abord de valider la décision avant de la connecter à des branches réelles.

Limite connue : cette règle par mots-clés ne comprend pas tout le langage naturel. Elle sert uniquement à apprendre le rôle d’un routeur déterministe.

Validation technique de 5.3 :

- compilation réussie ;
- lint réussi ;
- 3 suites de tests réussies ;
- 6 tests réussis au total.

Prochaine activité : connecter la route calculée à une branche d’exécution observable.

### 5.5 — Conserver la route dans l’état

Le routeur est maintenant branché sur un middleware LangChain nommé `RequestRouter`. Avant le début du run, il calcule `requestRoute` à partir du dernier message et l’ajoute à l’état :

```text
message utilisateur
        ↓
RequestRouter
        ↓
state.requestRoute
        ├── conversation
        └── calculation
```

Cette étape ne change pas encore la branche d’exécution. Elle rend la décision explicite, typée et observable dans Studio avant de l’utiliser pour contrôler le parcours.

Expérience : lancer une demande conversationnelle puis une demande de calcul et vérifier dans l’état que `requestRoute` prend respectivement les valeurs `conversation` et `calculation`.

Vérifications techniques de 5.5 :

- compilation réussie ;
- 3 suites de tests réussies ;
- lint réussi ;
- serveur LangGraph démarré avec le middleware `RequestRouter`.

Le test Studio doit encore confirmer visuellement la valeur de `requestRoute` dans l’état de chaque run.

### Diagnostic 5.5 — Correction du contenu structuré

Le premier test Studio a révélé que les messages peuvent arriver sous la forme de blocs structurés, et pas uniquement comme une chaîne simple. Le middleware interprétait alors le contenu comme vide et retournait par défaut `conversation`.

La fonction `extractMessageText()` normalise maintenant les deux formats :

- chaîne directe ;
- tableau de blocs contenant un champ `text`.

Un test de régression vérifie qu’un bloc `{ type: 'text', text: 'Calcule 12 + 30.' }` produit bien la route `calculation`.

Après correction :

- le test ciblé de routage passe avec 5 cas ;
- la suite complète passe avec 7 tests ;
- la compilation et le lint passent.

Validation finale : après redémarrage du serveur et dans un nouveau thread Studio,
une demande `Calcule 12 + 30.` doit produire `requestRoute = calculation`.

Validation API réalisée sur le serveur local :

- un nouveau thread a reçu `Calcule 12 + 30.` ;
- l’état final contient `requestRoute = calculation` ;
- l’outil `add_numbers` a retourné `12 + 30 = 42`.

Si Studio affiche encore `conversation`, il faut vérifier que l’interface utilise
le serveur et l’assistant rechargés, puis créer un nouveau thread. Un ancien run ou
un état déjà affiché dans Studio ne constitue pas une nouvelle validation du
middleware.

### 5.4 — Quand utiliser un routeur déterministe ?

Un routeur déterministe est courant lorsque la règle est explicite, stable et vérifiable :

- commandes comme `/calc` ou `/help` ;
- contrôle d’accès et règles de sécurité ;
- séparation de domaines connus ;
- limitation des coûts ou choix d’un modèle ;
- actions qui exigent une politique stricte.

Il est moins adapté lorsque la demande est ambiguë ou nécessite une compréhension sémantique riche. Dans ce cas, un modèle peut classifier la demande, idéalement avec une sortie structurée et des catégories limitées.

L’approche hybride est souvent préférable :

```text
règles déterministes de sécurité et de structure
                    ↓
classification LLM pour les cas ambigus
                    ↓
branche d’exécution contrôlée
```

Notre routeur par mots-clés est donc un exercice pédagogique. Dans une architecture LangGraph complète, ce type de décision peut ensuite devenir une fonction de routage ou une arête conditionnelle entre des nœuds. Les agents LangChain restent adaptés au démarrage rapide avec une boucle modèle-outils préconstruite.

## Méthode de travail

À chaque point :

1. expliquer le concept ;
2. observer le code existant ;
3. réaliser une petite modification ou expérience ;
4. vérifier le contrat technique dans la documentation officielle LangChain ou LangGraph ;
5. vérifier le résultat avec un test, le CLI ou Studio ;
6. mettre à jour ce fichier.

## Règle de vérification documentaire

Chaque étape technique doit être confrontée à trois sources, dans cet ordre :

1. la documentation officielle LangChain/LangGraph correspondant à l’API étudiée ;
2. les types et la version réellement installés dans ce projet ;
3. une validation locale par test, compilation, CLI ou Studio.

Pour le point 5.5, la documentation officielle confirme que `message.content` peut
être une chaîne ou une liste de blocs structurés, et que `beforeAgent` peut retourner
des champs fusionnés dans l’état du middleware. Notre fonction
`extractMessageText()` et le champ `requestRoute` suivent donc le contrat documenté,
avec une vérification supplémentaire par les tests locaux.

Références utilisées :

- [Messages LangChain](https://docs.langchain.com/oss/javascript/langchain/messages) ;
- [Custom middleware LangChain](https://docs.langchain.com/oss/javascript/langchain/middleware/custom).
