# Efrei Sport Climbing — AWS App (Serverless · SAM · TypeScript)

Plateforme serverless pour automatiser les flux ESC (webhooks, traitements, exports, notifications) sur AWS.
Architecture basée sur **AWS SAM** avec **Lambda (TypeScript)**, **API Gateway**, et (selon besoins) **DynamoDB / S3 / Secrets Manager / EventBridge**.

---

## 🎯 Objectifs

- Centraliser les **webhooks externes** (cotisations, billetterie, shop) et orchestrer les traitements côté AWS.
- Exposer des **APIs internes** pour les outils ESC (bots Discord, dashboards, scripts).
- Factoriser un **code commun** via une *Lambda Layer* `commons` (types, clients, helpers).
- Faciliter des déploiements reproductibles via **SAM** (CloudFormation).

---

## 🗂️ Arborescence du repo

```
.
├─ events/                # Exemples d’événements pour tests locaux
├─ functions/             # Fonctions Lambda (TypeScript)
├─ layers/
│   └─ commons/           # Code partagé (types/clients/utils)
├─ utils/                 # Scripts/outils de dev
├─ template.yaml          # Template SAM (ressources & permissions)
├─ samconfig.toml         # (facultatif) Paramètres de déploiement
└─ README.md
```

---

## 🧱 Architecture logique

```
Client (HelloAsso / Discord)
        │
        ▼
   API Gateway (REST)
        │       ┌───────────────┐
        ├──────►│  Lambda(s)    │
        │       │  TypeScript   │
        │       └───────────────┘
        │             │
        │             ├─► DynamoDB (Orders/Tickets/Sessions) 
        │             ├─► S3 (exports/archives)
        │             ├─► Secrets Manager (tokens/keys)
        │             └─► EventBridge/CloudWatch (jobs)
        │
        └─► Webhooks sortants (Discord)
```

**Layer `commons/`** : types métier, clients AWS (DDB/S3/Secrets), logging, validation, erreurs normalisées.

---

## 🛠️ Prérequis

- **Node.js 22+**
- **Docker** (pour `sam local`)
- **AWS CLI** configuré (profil avec droits CloudFormation/IAM/Lambda/etc.)
- **AWS SAM CLI** installé

---

## ▶️ Développement local

Installer & builder :
```bash
sam build
```

Lancer l’API locale :
```bash
sam local start-api
# L’API écoute par défaut sur http://127.0.0.1:3000
```

Invoquer une fonction avec un event d’exemple :
```bash
sam local invoke <NomDeLaFonction> --event events/event.json
# Exemple généré d’origine : HelloWorldFunction et events/event.json
```

Consulter les logs d’une fonction déployée :
```bash
sam logs -n <NomDeLaFonction> --stack-name <NomDeLaStack> --tail
```

---

## ☁️ Déploiement

### Première fois (guidé)
```bash
sam deploy --guided
```

### Déploiements suivants
```bash
sam build && sam deploy
```

---

## 🧪 Tests

Si tu utilises Jest côté TypeScript (ex. sous `functions/<lambda>/`):
```bash
npm install
npm test
```

---

## 🚦 Quality Gates suggérés

- CI: `sam build` + `npm test` + `eslint --max-warnings=0`.
- IaC: *cfn‑nag* / *cfn‑guard* (recommandé) sur `template.yaml`.
- Sécu: pas de secrets en clair, uniquement **Secrets Manager**.

---

## 🧹 Nettoyage (⚠️ destructif)

```bash
aws cloudformation delete-stack --stack-name efrei-sport-climbing-aws-app
```

---

## 🤝 Contribuer

1. Branche `feature/<nom>`
2. Commits atomiques (message clair)
3. PR décrivant contexte, tests, impacts infra
4. Review obligatoire avant merge `master`

---

## 📄 Licence

MIT