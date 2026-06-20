// File: app/page.tsx · Landing (Server Component, marketing). No wallet, no data fetch.
import Link from "next/link";
import { EXPLORER } from "@/lib/config";
import { Reveal } from "./components/Reveal";
import { BrandMark } from "./components/BrandMark";
import { LiveHeroNumbers } from "./components/LiveHeroNumbers";

const DELEVERAGE_TX = "4S5bhsgZhsrwjaavUNBAZKyDwWKxKfruUTUXD6jT3S8K";
const REFINANCE_TX = "BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK";

export default function Landing() {
  return (
    <div className="wrap">
      <Reveal />
      <header className="shell topbar">
        <div className="wordmark"><BrandMark />RefiRail</div>
        <nav className="topnav">
          <a className="hide-sm" href="#operations">Operations</a>
          <a className="hide-sm" href="#proof">Proof</a>
          <Link href="/app">Launch app</Link>
        </nav>
      </header>

      <main>
        <section className="shell hero">
          <p className="eyebrow reveal" data-d="1">DeepBook · Sui mainnet</p>
          <h1 className="headline reveal" data-d="2">
            Move your loan, or <em>de-risk</em> it. One signature.
          </h1>
          <p className="subhead reveal" data-d="3">
            RefiRail manages a Sui lending position in a single atomic transaction with zero upfront
            capital. Move it to a cheaper rate, or pay down debt to lift your health factor. If any
            step would leave you worse off, the whole transaction reverts and your position is
            untouched.
          </p>

          {/* The Rail: signature animation */}
          <div className="rail-stage reveal" data-d="4" aria-hidden="true">
            <div className="rail">
              <div className="rail-track"><div className="rail-fill" /></div>
              <div className="rail-meta">one atomic PTB · DeepBook flash route</div>
              <span className="rail-stop s1" />
              <span className="rail-stop s2" />
              <span className="rail-node" />
            </div>
            <div className="rail-ends">
              <div className="rail-end from">
                <span className="label">Position on</span>
                <span className="name">Navi</span>
              </div>
              <div className="rail-end to">
                <span className="label">Settled into</span>
                <span className="name">Suilend</span>
              </div>
            </div>
          </div>

          <div className="cta-row reveal" data-d="5">
            <Link className="btn btn-primary" href="/app">Launch app <span className="arr">&#8594;</span></Link>
            <a className="btn btn-ghost" href="#operations">See how it works</a>
          </div>
        </section>

        <section id="operations" className="shell ops">
          <p className="section-kicker reveal">Two operations · one engine</p>
          <h2 className="section-title reveal" data-d="1">The hard part is on-chain. The choice is yours.</h2>

          <div className="ops-grid">
            <article className="op-card lead reveal" data-d="1">
              <span className="op-index">01</span>
              <p className="op-tag">The hero · DeepBook route</p>
              <h3 className="op-h">Reduce my risk</h3>
              <p className="op-p">
                Pay down a slice of USDC debt with SUI collateral, routed fee-free through DeepBook.
                Pick 25, 50, or 75 percent and the health factor climbs.
              </p>
              <LiveHeroNumbers which="health" />
            </article>

            <article className="op-card reveal" data-d="2">
              <span className="op-index">02</span>
              <p className="op-tag muted">The trust-builder</p>
              <h3 className="op-h">Move to a cheaper rate</h3>
              <p className="op-p">
                Refinance the Navi loan to Suilend&apos;s lower borrow APR in one atomic PTB. Secondary,
                but it proves the engine generalizes across lenders.
              </p>
              <LiveHeroNumbers which="apr" />
            </article>
          </div>

          <div id="proof" className="proof reveal">
            <p className="proof-claim">
              <b>Every operation is real on Sui mainnet.</b> No testnet, no mocks. Two transactions,
              already settled and verifiable.
            </p>
            <div className="proof-link">
              <span className="pl-label">Atomic deleverage · health 1.89 &#8594; 2.92</span>
              <a className="mono" href={EXPLORER.tx(DELEVERAGE_TX)} target="_blank" rel="noopener noreferrer">4S5bhsgZ…</a>
            </div>
            <div className="proof-link">
              <span className="pl-label">Atomic refinance · Navi &#8594; Suilend</span>
              <a className="mono" href={EXPLORER.tx(REFINANCE_TX)} target="_blank" rel="noopener noreferrer">BiMBPK7s…</a>
            </div>
          </div>
        </section>

        <section className="shell seam reveal">
          <p className="line">Now <em>watch it work.</em></p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" href="/app">Launch app <span className="arr">&#8594;</span></Link>
          </div>
        </section>

        <footer className="shell foot">
          <div className="foot-grid">
            <div>
              <p className="fw">RefiRail</p>
              <p className="ft">Every operation is real on Sui mainnet. No testnet, no mocks.</p>
            </div>
            <div className="fmeta">
              <span><b>Track</b> DeepBook</span>
              <span><b>Network</b> Sui mainnet</span>
              <span><b>Live</b> refirail.vercel.app</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
