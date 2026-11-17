import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span className="eyebrow">RENTFLOW · DÉMONSTRATION</span>
      <h1>Cette page n’existe pas.</h1>
      <p>Le lien a peut-être changé. Revenez à l’accueil ou connectez-vous à votre espace.</p>
      <div>
        <Link className="button button-primary" href="/">Accueil</Link>
        <Link className="button button-outline" href="/connexion">Se connecter</Link>
      </div>
    </main>
  )
}
