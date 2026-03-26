function PresentationView() {
  return (
    <>
      <section className="panel presentation-hero">
        <p className="presentation-kicker">
          Performance Under Pressure — Mathematical Model
        </p>
        <p className="presentation-date">
          Compiled from conversation session, March 25 2026
        </p>
        <h2>Origin &amp; Intent</h2>
        <p>
          The model formalizes a self-observed pattern: performance output is
          higher and more reliable under high-stakes, time-pressured
          conditions.
        </p>
        <p>
          The goal is to derive practical interventions: ways to engineer the
          conditions that produce peak output earlier in a timeline, without
          waiting for natural deadline pressure.
        </p>
      </section>

      <section className="panel">
        <h2>What this model does</h2>
        <ul className="presentation-list">
          <li>
            Explains how stress can shift performance from low baseline to peak
            execution.
          </li>
          <li>
            Separates internal output generation from external outcome
            evaluation.
          </li>
          <li>
            Supports simulation and scenario testing for possible interventions.
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>Two-layer architecture</h2>
        <div className="presentation-grid">
          <article className="presentation-card">
            <h3>Layer 1: Output engine</h3>
            <p>
              Models instantaneous performance <code>P(t)</code> from stress,
              capability, focus, and fatigue.
            </p>
            <p className="presentation-equation">
              <code>P(t) = A * Phi * S^alpha * exp(-beta*S) * exp(-lambda*t) * F(S) + epsilon</code>
            </p>
          </article>

          <article className="presentation-card">
            <h3>Layer 2: Outcome evaluation</h3>
            <p>
              Maps accumulated output <code>Omega</code> against threshold{' '}
              <code>theta</code> into success probability <code>p</code>.
            </p>
            <p className="presentation-equation">
              <code>Omega = integral(P(t)dt), p = g(Omega, theta, X)</code>
            </p>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2>Core intuition</h2>
        <ul className="presentation-list">
          <li>
            Stakes and deadline pressure increase stress; moderate stress
            improves activation.
          </li>
          <li>
            Excess stress can overload performance unless focus remains high.
          </li>
          <li>
            Task stimulation reduces the stress required to enter full focus.
          </li>
          <li>
            Belief in consequence reality affects effective stakes and therefore
            motivation.
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>From theory to intervention</h2>
        <p>
          This implementation is intended as a structured thinking tool. It is
          useful for exploring leverage points, not for claiming clinical
          certainty.
        </p>
        <div className="presentation-grid">
          <article className="presentation-card">
            <h3>Practical levers</h3>
            <ul className="presentation-list">
              <li>Raise perceived stakes through public commitment.</li>
              <li>Shorten timelines with sub-deadline compression.</li>
              <li>Increase task stimulation to lower focus threshold.</li>
            </ul>
          </article>

          <article className="presentation-card">
            <h3>Built-in validation</h3>
            <ul className="presentation-list">
              <li>Simulation and trajectory views</li>
              <li>Sensitivity ranking of model parameters</li>
              <li>Baseline vs intervention comparison</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  )
}

export default PresentationView
