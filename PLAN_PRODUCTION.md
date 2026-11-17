# RentFlow — plan de passage en production

## Point de départ

L'application est en transition de la démo vers une version Supabase. Les parcours Auth et plusieurs écrans propriétaires/locataires utilisent maintenant Supabase, tandis que des pages restent en démonstration ou à finaliser. Le cahier des charges fourni est la référence produit.

Le périmètre de la première version est la gestion par un titulaire de compte (propriétaire ou agent) : biens, logements, locataires, baux, échéances, déclaration et confirmation manuelle des loyers, rappels envoyés par la personne, quittances et synthèse mensuelle. RentFlow ne collecte ni ne transfère l'argent. L'état des lieux reste après la première version.

## Avancement

- **Étape 0 — environnement Supabase : effectuée par le porteur du projet.** Les deux scripts SQL ont déjà été exécutés dans son projet Supabase.
- **Étape 1 — fondation Auth : intégrée, configuration Supabase à valider.** E-mail + mot de passe, sans SMS; le téléphone sert de contact. Les clients Supabase, le rafraîchissement de session, le callback e-mail, l'inscription, la connexion, la déconnexion, la récupération et le profil propriétaire sont branchés. Toutes les routes de gestion propriétaire exigent une session.
- **Étapes 2 à 5 : en cours.** Les biens, logements, baux, échéances, paiements, rappels, quittances et synthèse sont connectés dans le contexte propriétaire; les pages d'historique et quittance locataire demandent un lien personnel. La fin de bail, la création transactionnelle d'un bail et la mise à jour atomique d'un logement sont ajoutées; il reste la recette authentifiée.
- **Étapes 6 à 7 : à réaliser.** Les forfaits, pages publiques, observabilité, sauvegarde, déploiement et recette de bout en bout demandent encore du travail.

## Recette technique du 17 novembre 2026

- `npx tsc --noEmit` passe.
- `npm run build` passe à la seconde tentative et génère les 43 routes. Au premier lancement, Next.js 16.4.3 a interrompu le build pour signaler une vulnérabilité connue; la seconde tentative a continué après l'avertissement. La mise à niveau vers une version corrigée reste un prérequis avant publication.
- Le contrôle HTTP sur le build de production donne 200 aux routes publiques (`/`, `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/contact`, `/forfaits`). Les routes propriétaire testées redirigent vers `/connexion` sans session. `/locataire/dashboard` redirige vers `/paiement`; `/locataire/historique` affiche la demande de lien personnel sans divulguer d'historique.
- Supabase Auth répond 200, autorise les inscriptions et renvoie `mailer_autoconfirm=true` (confirmation d'e-mail non requise). Cela valide la clé et les réglages publics, pas un parcours réel de création/connexion de compte.
- L'API PostgREST, vérifiée en lecture seule avec la clé de service locale (jamais affichée), répond pour les tables métier vérifiées et l'OpenAPI expose les RPC des migrations 03 à 06. La lecture de ces tables avec la clé publique seule est refusée, comme attendu sans session. Cela ne vérifie pas l'application effective des politiques RLS ni les écritures authentifiées.
- Aucun compte, logement, bail ou paiement de test n'a été créé. L'inscription, la session, l'isolation entre deux comptes, les liens locataire, les écritures transactionnelles et le verrouillage d'un abonnement doivent encore être testés avec des comptes de recette dédiés.
- Le projet Supabase retourne zéro forfait activé. `NEXT_PUBLIC_SUPPORT_EMAIL` n'est pas configurée. La tarification/activation des abonnements, la réception du formulaire contact, les sauvegardes/observabilité et les informations légales restent à finaliser; le produit n'est donc pas prêt pour un lancement public.
- Cette recette actualise les diagnostics Auth du 16 novembre ci-dessous : la confirmation d'e-mail est maintenant désactivée sur le projet actuellement configuré.
- **Mise à niveau sécurité du 17 novembre :** l'action interactive Next n'a pas pu récupérer ses métadonnées. Après le choix « Upgrade now » du porteur, `next` a été mis à jour en `16.4.6`; `package-lock.json` et `pnpm-lock.yaml` sont synchronisés. `npx tsc --noEmit` et `npm run build` passent désormais avec cette version et sans l'avertissement Next précédent. Le serveur de production a répondu comme attendu aux mêmes routes publiques et protégées.
- `npm audit --omit=dev` signale encore quatre vulnérabilités modérées dans la chaîne `shadcn` → `ts-morph` → `@ts-morph/common` → `minimatch`. La correction automatique proposée (`--force`) ferait une mise à niveau majeure de `shadcn` vers 1.0.0; elle n'a pas été appliquée. À évaluer séparément avant publication.
- **Correction Auth du 17 novembre :** la capture a révélé une soumission native GET du formulaire de connexion, qui plaçait les champs dans l'URL et les journaux du serveur. Les formulaires d'authentification utilisent maintenant POST avec une action explicite; leurs boutons restent désactivés jusqu'à l'hydratation JavaScript; `/connexion` retire côté serveur les anciens paramètres de connexion et redirige vers une URL propre. Les actions Auth sont bloquées sur une origine non sécurisée (HTTP via IP LAN); utiliser localhost sur le poste de développement ou HTTPS sur un autre appareil. Vérifications : TypeScript et build Webpack en copie isolée réussis; un GET synthétique contenant des paramètres factices retourne une redirection sans ces paramètres, et le HTML de connexion contient POST. Le titulaire doit changer immédiatement le mot de passe exposé dans sa capture; le parcours de connexion n'est pas validé tant que ce changement n'a pas été fait.

## Livrables de cette étape

- `supabase/01_schema.sql` : tables, contraintes, index, types, création des profils/abonnements Auth, historique de changements et émission de quittance.
- `supabase/02_security.sql` : privilèges minimaux, politiques RLS et fonctions contrôlées pour les actions financières et les liens locataires.
- `supabase/03_public_tenant_receipt_and_cash_guard.sql` : quittance publique limitée au lien locataire et garde contre la double validation espèces/déclaration.
- `supabase/04_lease_rent_changes.sql` : historique des loyers et rafraîchissement idempotent des statuts d'échéances à chaque connexion.
- `supabase/05_lease_management.sql` : fin de bail contrôlée, mise à jour atomique du logement et protection contre les modifications directes du bail.
- `supabase/06_trial_read_only.sql` : garde PostgreSQL qui passe les comptes en lecture seule à la fin de l'essai ou de la période active.
- Le titulaire indique avoir exécuté les scripts 01 à 06 dans son projet Supabase. Le schéma OpenAPI distant expose maintenant les RPC de quittance, d'enregistrement espèces, de création/fin de bail, de modification atomique du logement et de contrôle d'abonnement, ainsi que la table `lease_rent_changes`.
- Le build Next.js Webpack et le contrôle TypeScript passent localement; cela ne valide pas les paramètres Auth, les fonctions SQL ni l'isolation effective sur le projet Supabase.
- **Vérification du 16 novembre 2026 :** `/auth/v1/settings` répond HTTP 200 et la lecture anonyme de `profiles` est refusée (HTTP 401 / code `42501`). Initialement, les migrations 03 à 05 n'étaient pas visibles. Après que le titulaire a indiqué les avoir appliquées, l'inspection en lecture seule de l'OpenAPI du projet retourne HTTP 200 et montre tous les RPC et la table attendus des scripts 03 à 06. Le mot de passe Postgres a été exposé dans le chat et doit être renouvelé.
- La vérification SQL directe n'est pas possible depuis cet environnement : `db.<project-ref>.supabase.co` ne résout qu'en IPv6, sans route IPv6 (`Network is unreachable`). Aucun script n'a été exécuté par Codex et aucune URL locale n'a été changée. L'OpenAPI confirme les ressources, mais pas les index uniques ni les triggers; ceux-ci restent à valider par inspection SQL ou par recette des comportements concernés.
- Correction locale du 16 novembre : le fuseau IANA du profil propriétaire est maintenant chargé avant la génération des échéances; tableaux de bord, synthèse, rappels et date par défaut des paiements en espèces utilisent ce fuseau au lieu de celui du navigateur. Repli : `Africa/Douala`. TypeScript et build de production passent après cette correction.
- Correction Auth du 16 novembre : Supabase a `mailer_autoconfirm=false`, donc le nouveau compte doit confirmer son adresse avant de recevoir une session; l'inscription affiche maintenant une étape explicite de confirmation au lieu de sembler bloquée. Après confirmation, le callback et la connexion par défaut dirigent vers `/espace-proprietaire` (tableau de bord), pas vers la page de profil. TypeScript et build de production passent après ce changement. La recette avec un vrai compte et la livraison du courriel restent à vérifier par le porteur du projet.
- Vérification suivante : Auth répond HTTP 200, l'inscription est autorisée, mais `mailer_autoconfirm=false` est toujours actif. Il faut désactiver **Confirm email** dans Supabase Authentication → Sign In / Providers → Email pour obtenir une session immédiatement après l'inscription; les adresses ne seront alors pas vérifiées automatiquement. Les comptes de test déjà créés et non confirmés doivent être confirmés par le propriétaire dans Auth → Users ou supprimés puis recréés après le changement. Le mot de passe continue d'être vérifié par Supabase Auth; la récupération par e-mail nécessite toutefois une adresse accessible.
- Après la capture d'écran du 16 novembre, la vérification de `/auth/v1/settings` sur le projet `NEXT_PUBLIC_SUPABASE_URL` confirme encore `mailer_autoconfirm=false`. Le changement n'est donc pas actif sur le projet réellement utilisé par l'application (ou pas enregistré). L'erreur de connexion est maintenant traduite en français avec l'action à prendre; les écrans d'inscription et connexion ne portent plus le bandeau de démonstration.
- Re-vérification du contrôle : `npx tsc --noEmit` passe; `/connexion` répond HTTP 200 et le rendu mobile a été inspecté. Le build isolé a été interrompu avant la fin pendant que le serveur de développement du propriétaire tournait; il n'est pas marqué comme validé après les dernières modifications.
- Recette HTTP locale de 40 URL après le build : les routes publiques répondent 200; les routes propriétaires sans session redirigent vers `/connexion`; les anciennes routes locataires redirigent vers `/paiement`; aucune route testée n'a renvoyé de 5xx. Cette vérification confirme le chargement et les gardes de navigation, pas les interactions authentifiées ni les écritures Supabase.
- **Validation locale du 16 novembre 2026 :** `npx tsc --noEmit` et `npx next build --webpack` terminent sans erreur; le build recense les routes publiques, propriétaires et locataires. La base contient actuellement zéro forfait activé et `NEXT_PUBLIC_SUPPORT_EMAIL` n'est pas configurée; les tarifs et l'adresse de contact ne peuvent donc pas être publiés comme des valeurs réelles.
- Vérification locale du serveur de production : `/espace-proprietaire`, `/proprietaire/profil` et `/proprietaire/logements/[id]` redirigent vers `/connexion` sans session; `/paiement` reste accessible pour le parcours par lien locataire.

## Étapes de réalisation

### 0 — Cadrage et environnement

1. Le porteur du projet indique avoir exécuté les scripts 01 à 06 dans l'ordre; vérifier les index uniques et triggers de 03 et 06 sur Supabase.
2. Créer des environnements Supabase distincts pour développement et production; garder les secrets dans les variables d'environnement locales et l'hébergeur.
3. Sur un nouveau projet seulement, exécuter 01 puis 02. Sur le projet existant, appliquer uniquement 03 à 06, dans l'ordre. Contrôler le schéma, les fonctions et les politiques depuis Supabase.
4. Configurer Auth dans le Dashboard : confirmation d'adresse, modèles de récupération, URL de redirection, CAPTCHA et durée des sessions. `auth.users` et `auth.sessions` sont gérés par Supabase; l'application ne crée pas ses propres tables de mots de passe ou de sessions.

**Livré quand :** l'inscription de test crée un profil et un essai, et les accès anonymes ne lisent aucune table métier.

### 1 — Fondation Next.js et accès

1. Ajouter les clients Supabase adaptés aux composants serveur et client, valider les variables d'environnement et retirer les données d'exemple des parcours réels.
2. Ajouter les contrôles de session, la redirection des visiteurs, les erreurs d'authentification, la déconnexion et les pages d'inscription/connexion/récupération.
3. Utiliser l'e-mail comme identifiant avec mot de passe (choix confirmé); le téléphone reste une coordonnée de contact. Ne jamais stocker de mot de passe dans les tables RentFlow.
4. Séparer clairement les pages publiques, les pages du titulaire connecté et le lien public temporaire du locataire.

**Pages concernées :** `/inscription`, `/connexion`, `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe`, `/proprietaire/profil`, `/locataire/profil`.

### 2 — Données propriétaires : biens, logements, locataires et baux

1. Remplacer le contexte fictif par des lectures/écritures Supabase scindées par `auth.uid()`.
2. Implémenter les formulaires de création, modification, archivage et validation; conserver les éléments avec historique financier.
3. Créer un bail actif par logement, avec téléphone obligatoire, loyer, date de début et échéance; prendre en charge les jours 29–31.
4. Prévoir l'ajout en lot de logements et les logements vacants sans échéance.

**Pages concernées :** `/logements`, `/logements/supprimer`, `/proprietaire/logements/[id]`, `/proprietaire/locataires`, `/nouveau-locataire` et leurs anciennes URL de redirection.

### 3 — Génération mensuelle et suivi des loyers

1. Générer une échéance unique par bail et par mois, avec un montant figé pour préserver l'historique lors d'un changement de loyer.
2. Ajouter le traitement planifié des échéances à venir, dues et en retard; rendre l'opération répétable sans doublons.
3. Brancher le tableau de bord, les filtres, le compteur à confirmer, les totaux et la liste par logement sur les données persistantes.
4. Permettre l'enregistrement d'espèces et les actions de confirmer, refuser et annuler; garder les transitions dans le journal.

**Pages concernées :** `/espace-proprietaire`, `/proprietaire/dashboard`, `/paiements-a-confirmer`, `/confirmer-paiement`, `/proprietaire/paiements`.

### 4 — Lien locataire et communication

1. Créer des liens à forte entropie, stocker leur empreinte, prévoir expiration/révocation et limiter chaque lien à une seule période.
2. Construire l'écran public du locataire à partir de la fonction SQL dédiée; ne jamais exposer une liste de locataires, un identifiant de compte ou les autres loyers.
3. Implémenter « J'ai payé » comme déclaration non vérifiée; le propriétaire reste seul à confirmer/refuser.
4. Générer le texte des rappels J-5 et jour J avec le bon numéro et le bon lien, puis ouvrir WhatsApp ou SMS manuellement. Aucun robot ni transfert d'argent.
5. Valider la protection anti-abus des fonctions anonymes et le comportement WhatsApp sur les téléphones ciblés.

**Pages concernées :** `/paiement`, `/locataire/dashboard`, `/locataire/historique`, `/rappels`.

### 5 — Quittances et synthèse

1. Émettre une quittance numérotée après confirmation, avec photographie des noms, logement, mois, montant, mode et date.
2. Marquer une quittance annulée si la confirmation est annulée; conserver l'événement dans l'historique.
3. Calculer la synthèse mensuelle à partir des échéances et paiements confirmés; détailler impayés, mode de paiement et retard.
4. Générer et vérifier l'export PDF; préciser que le rapport comptabilise les loyers encaissés et non un bénéfice.

**Pages concernées :** `/quittance`, `/proprietaire/quittances`, `/locataire/quittances`, `/synthese`, `/proprietaire/statistiques`.

### 6 — Essai, forfaits et exploitation

1. Finaliser les paliers et le prix avec le porteur de projet; le cahier des charges laisse le tarif à décider.
2. Ajouter le contrôle d'essai, le passage en lecture seule, les rappels avant fin d'essai et l'activation administrative d'un abonnement payé hors application.
3. Terminer le flux agent : titulaire du compte, coordonnées de paiement de l'agent, rapport mensuel à transmettre au propriétaire. Pas de gestion de reversement dans l'application.
4. Ajouter journalisation technique, suivi des erreurs, sauvegardes, procédure de restauration, limites de débit et procédure de réponse aux incidents.

**Pages concernées :** `/forfaits`, `/tarifs`, `/questions`, et le futur écran administratif non encore présent.

### 7 — Vérification avant ouverture aux utilisateurs

1. Tester chaque rôle et chaque route, y compris utilisateur déconnecté, deux comptes propriétaires séparés, lien expiré/révoqué, paiements concurrents et historique annulé.
2. Vérifier par des tests d'accès que ni `anon` ni un autre propriétaire ne peuvent lire ou modifier les données d'un compte.
3. Vérifier les migrations sur une base vierge et sur une copie avec données; contrôler les sauvegardes et la restauration.
4. Faire une recette mobile en réseau lent et une validation métier avec quelques propriétaires et locataires.
5. Publier les conditions, la politique de confidentialité, les modalités de conservation et les tarifs validés avant de traiter des données réelles.
6. Déployer d'abord en préproduction, puis ouvrir progressivement la production et surveiller les erreurs.

## Ordre de travail à respecter

Le développement suivra les étapes 0 à 7 dans l'ordre. Chaque étape devra être utilisable et vérifiable avant d'entamer la suivante. Le socle de données et l'isolation RLS précèdent les écrans qui écrivent des données; les transactions sont testées avant l'ouverture aux utilisateurs. Le périmètre I « état des lieux » sera planifié après la première version, comme le prévoit le cahier des charges.

## Points à trancher avant de coder les parcours dépendants

- Connexion : e-mail + mot de passe, sans SMS; téléphone utilisé comme contact. La confirmation par e-mail et la récupération dépendent de la configuration Auth du Dashboard.
- Tarifs et règle exacte de lecture seule à la fin de l'essai.
- Durée de conservation des quittances et procédure de suppression du compte.
- Domaine de production, fournisseur d'hébergement et adresse d'envoi des e-mails.
- Approbation du modèle métier et des scripts SQL sur le projet de développement avant toute migration de production.

