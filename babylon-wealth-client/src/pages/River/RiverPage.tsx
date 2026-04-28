import { useState } from 'react';
import { useNetWorth } from '../../hooks/useNetWorth';
import { NetWorthChart } from '../../components/NetWorthChart';
import { MoneyFlowChart } from '../../components/MoneyFlowChart';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import './RiverPage.css';

export function RiverPage() {
  const { user } = useAuth();
  const { data: nw, isLoading } = useNetWorth();
  const [showTotal, setShowTotal] = useState(false);

  const displayName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="river-page">
      <header className="river-page__header">
        <div>
          <div className="river-page__greeting">Portfolio Overview</div>
          <div className="river-page__name">Hello, {displayName}</div>
        </div>
      </header>

      <section className="river-card">
        {/* NW type toggle — like the Robinhood chart/bar toggle */}
        {nw?.hasProperties && (
          <div className="river-card__toggle">
            <button
              className={`toggle-btn${!showTotal ? ' toggle-btn--active' : ''}`}
              onClick={() => setShowTotal(false)}
            >
              Liquid NW
            </button>
            <button
              className={`toggle-btn${showTotal ? ' toggle-btn--active' : ''}`}
              onClick={() => setShowTotal(true)}
            >
              Total NW
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="river-card__loading">Loading…</div>
        ) : nw ? (
          <NetWorthChart
            currentLiquid={nw.liquidNetWorth}
            currentTotal={nw.totalNetWorth}
            hasProperties={nw.hasProperties}
            showTotal={showTotal}
          />
        ) : null}

        {nw && (
          <div className="river-card__stats">
            <div className="river-card__stat">
              <div className="river-card__stat-label">Assets</div>
              <div className="river-card__stat-value river-card__stat-value--pos">
                {formatCurrency(nw.totalAssets)}
              </div>
            </div>
            <div className="river-card__stat-divider" />
            <div className="river-card__stat">
              <div className="river-card__stat-label">Liabilities</div>
              <div className="river-card__stat-value river-card__stat-value--neg">
                {formatCurrency(nw.totalLiabilities)}
              </div>
            </div>
            {nw.creditUtilizationPercent != null && (
              <>
                <div className="river-card__stat-divider" />
                <div className="river-card__stat">
                  <div className="river-card__stat-label">Credit Used</div>
                  <div className="river-card__stat-value">
                    {nw.creditUtilizationPercent.toFixed(1)}%
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="river-card">
        <MoneyFlowChart />
      </section>
    </div>
  );
}
