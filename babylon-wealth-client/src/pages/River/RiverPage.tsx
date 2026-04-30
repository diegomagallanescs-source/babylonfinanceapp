import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNetWorth } from '../../hooks/useNetWorth';
import { useNetWorthHistory } from '../../hooks/useNetWorthHistory';
import { useAnnualSummary } from '../../hooks/useAnnualSummary';
import { NetWorthChart } from '../../components/NetWorthChart';
import { formatCurrency, formatDelta, formatPercent } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { getTier, getTierLevel, formatRiverSpeed } from '../../constants/tiers';
import { annotateNetWorth, deleteAnnotation } from '../../api/networth';
import type { TimePeriod } from '../../types';
import './RiverPage.css';

// ─────────────────────────────────────────────────────────
// DRY BED / DESERT SCENE  (rings 0)
// ─────────────────────────────────────────────────────────

function DryBedContent({ sid }: { sid: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`dryAtmos-${sid}`} cx="50%" cy="25%">
          <stop offset="0%"   stopColor="#5A2A00" stopOpacity="0.9" />
          <stop offset="55%"  stopColor="#3D1A00" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1A0800" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`sunG-${sid}`} cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#FFE4A0" stopOpacity="0.55" />
          <stop offset="50%"  stopColor="#C8730A" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#C8730A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="380" height="130" fill="#1C0D04" />
      <ellipse cx="190" cy="70" rx="190" ry="130" fill={`url(#dryAtmos-${sid})`} />

      {/* Faded harsh sun */}
      <circle cx="310" cy="32" r="32" fill={`url(#sunG-${sid})`} />
      <circle cx="310" cy="32" r="20" fill="#FFD870" opacity="0.14" />
      <circle cx="310" cy="32" r="11" fill="#FFE880" opacity="0.10" />
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
        const rad = deg * Math.PI / 180;
        return <line key={i}
          x1={310 + 24*Math.cos(rad)} y1={32 + 24*Math.sin(rad)}
          x2={310 + 36*Math.cos(rad)} y2={32 + 36*Math.sin(rad)}
          stroke="#FFCC60" strokeWidth="0.7" opacity="0.13" />;
      })}

      {/* Sand dunes in distance */}
      <path d="M 0 195 Q 60 165 130 182 Q 200 198 260 170 Q 310 148 380 175 L 380 260 L 0 260 Z"
        fill="#1A0D04" opacity="0.9" />
      <path d="M 0 215 Q 90 190 170 205 Q 260 222 340 196 Q 365 188 380 200 L 380 260 L 0 260 Z"
        fill="#22100A" opacity="0.95" />

      {/* Main cracked earth mound */}
      <ellipse cx="190" cy="168" rx="152" ry="84" fill="#2E1A0A" opacity="0.9" />
      <ellipse cx="190" cy="168" rx="130" ry="71" fill="#3B2210" opacity="0.85" />
      <ellipse cx="190" cy="168" rx="108" ry="58" fill="#4A2D15" />

      {/* Major cracks */}
      {[
        'M 190 142 Q 162 152 140 167 Q 118 178 104 188',
        'M 190 142 Q 207 147 224 160 Q 244 174 258 184',
        'M 190 142 Q 186 120 183 104 Q 180 90 178 76',
        'M 190 142 Q 220 136 238 128 Q 256 120 268 114',
        'M 190 142 Q 166 133 150 125 Q 136 117 124 111',
        'M 190 192 Q 177 204 166 216',
        'M 190 192 Q 203 202 213 214',
        'M 154 158 Q 143 168 140 180',
        'M 233 153 Q 244 163 248 176',
      ].map((d, i) => (
        <path key={i} d={d} stroke="#1A0A00" strokeWidth={i < 5 ? 1.8 : 1.2} fill="none" opacity="0.9" />
      ))}
      {['M 158 148 Q 153 155 156 163','M 224 153 Q 230 160 226 167',
        'M 173 168 Q 168 173 172 180','M 208 171 Q 213 176 210 183',
        'M 144 178 Q 139 185 142 192','M 237 166 Q 242 174 238 181',
        'M 167 192 Q 162 198 165 204','M 212 188 Q 218 194 214 201',
      ].map((d, i) => (
        <path key={i} d={d} stroke="#1A0A00" strokeWidth="0.8" fill="none" opacity="0.65" />
      ))}

      {/* Gnarled dead tree — left */}
      <g transform="translate(75,228)">
        <path d="M -3 3 Q -10 8 -15 10" stroke="#2A1A0A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 3 3 Q 9 7 13 10" stroke="#2A1A0A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 0 0 Q -2 -22 1 -48 Q 3 -64 -6 -80" stroke="#3A2010" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M 0 0 Q -2 -22 1 -48 Q 3 -64 -6 -80" stroke="#251508" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.45" />
        <path d="M -1 -38 Q -20 -46 -24 -56" stroke="#2E1A0A" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M -1 -38 Q 15 -43 20 -52" stroke="#2E1A0A" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M -6 -65 Q -16 -74 -18 -84" stroke="#2E1A0A" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M -6 -65 Q 0 -76 3 -82" stroke="#2E1A0A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M -24 -56 Q -28 -65 -26 -72" stroke="#2A1A0A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M -24 -56 Q -19 -62 -16 -68" stroke="#2A1A0A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 20 -52 Q 24 -60 22 -67" stroke="#2A1A0A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 20 -52 Q 15 -59 17 -65" stroke="#2A1A0A" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* Tall saguaro cactus — right of center */}
      <g transform="translate(282,228)">
        <path d="M -7 0 L -7 -85 Q -7 -93 0 -93 Q 7 -93 7 -85 L 7 0 Z" fill="#2A5520" />
        <path d="M -3 -5 L -3 -85" stroke="rgba(80,160,60,0.22)" strokeWidth="3" fill="none" />
        <path d="M -7 -48 Q -38 -44 -35 -22 L -35 -6 Q -35 2 -28 2 Q -21 2 -21 -6 L -21 -22"
          stroke="#2A5520" strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M -31 -43 Q -31 -30 -31 -12" stroke="rgba(80,160,60,0.22)" strokeWidth="2.5" fill="none" />
        <path d="M 7 -60 Q 34 -56 31 -34 L 31 -14 Q 31 -6 25 -6 Q 19 -6 19 -14 L 19 -34"
          stroke="#2A5520" strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M 28 -55 Q 28 -42 28 -22" stroke="rgba(80,160,60,0.22)" strokeWidth="2.5" fill="none" />
        {[[-7,-22,-13,-22],[-7,-38,-13,-38],[-7,-54,-13,-54],[-7,-70,-13,-70],
          [7,-28,13,-28],[7,-44,13,-44],[7,-60,13,-60],[7,-76,13,-76],[0,-93,-4,-100]
        ].map(([x1,y1,x2,y2],i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1A3A10" strokeWidth="0.9" opacity="0.85" />
        ))}
      </g>

      {/* Shorter saguaro */}
      <g transform="translate(320,235)">
        <path d="M -5 0 L -5 -50 Q -5 -57 0 -57 Q 5 -57 5 -50 L 5 0 Z" fill="#2A5520" />
        <path d="M -5 -28 Q -22 -25 -20 -12 L -20 -3 Q -20 3 -15 3 Q -10 3 -10 -3 L -10 -12"
          stroke="#2A5520" strokeWidth="9" fill="none" strokeLinecap="round" />
      </g>

      {/* Prickly pear cluster */}
      <g transform="translate(140,235)">
        <ellipse cx="0" cy="0" rx="15" ry="11" fill="#2A5520" transform="rotate(-10)" />
        <ellipse cx="-11" cy="-15" rx="13" ry="10" fill="#2A5520" transform="rotate(-25)" />
        <ellipse cx="13" cy="-13" rx="12" ry="9" fill="#2A5520" transform="rotate(15)" />
        <ellipse cx="-5" cy="-28" rx="11" ry="9" fill="#2A5520" transform="rotate(-15)" />
        <ellipse cx="8" cy="-25" rx="9" ry="7" fill="#265018" transform="rotate(20)" />
        {[[-9,5,-14,10],[2,5,4,11],[9,2,13,6],[0,-9,-2,-15],[0,-30,-2,-36],[-9,-20,-14,-24]].map(([x1,y1,x2,y2],i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1A3A10" strokeWidth="0.9" opacity="0.9" />
        ))}
        <circle cx="0" cy="-10" r="3.5" fill="#8B1A1A" opacity="0.85" />
        <circle cx="-10" cy="-22" r="3" fill="#8B1A1A" opacity="0.85" />
        <circle cx="12" cy="-18" r="2.5" fill="#8B1A1A" opacity="0.8" />
      </g>

      {/* Scattered rocks */}
      {[
        {x:118,y:198,rx:15,ry:9,rot:15},{x:103,y:207,rx:10,ry:6,rot:-8},
        {x:252,y:202,rx:13,ry:8,rot:5},{x:264,y:208,rx:9,ry:5,rot:-12},
        {x:166,y:214,rx:10,ry:6,rot:20},{x:216,y:210,rx:12,ry:7,rot:-5},
        {x:68,y:236,rx:14,ry:8,rot:10},{x:342,y:228,rx:11,ry:6,rot:-18},
        {x:332,y:237,rx:7,ry:4,rot:8},{x:55,y:228,rx:8,ry:5,rot:-10},
        {x:355,y:220,rx:9,ry:5,rot:6},{x:25,y:240,rx:12,ry:7,rot:-5},
      ].map(({x,y,rx,ry,rot}, i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${rot})`}>
          <ellipse rx={rx} ry={ry} fill={i%3===0?'#2A1A0E':i%3===1?'#221408':'#1E1208'} />
          <ellipse rx={rx-2} ry={ry-1.5} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
          <ellipse cx={-rx*0.3} cy={-ry*0.3} rx={rx*0.38} ry={ry*0.38} fill="rgba(255,255,255,0.04)" />
        </g>
      ))}

      {/* Skull */}
      <g transform="translate(200,197)">
        <ellipse rx="9" ry="7" fill="#4A3A20" />
        <ellipse cy="5" rx="5" ry="4" fill="#3A2A14" />
        <circle cx="-3" cy="-1" r="2.5" fill="#1A0A00" />
        <circle cx="3"  cy="-1" r="2.5" fill="#1A0A00" />
        {[-4,-2,0,2,4].map((x,i) => (
          <rect key={i} x={x-0.8} y="7" width="1.6" height="3" fill="#3A2A14" rx="0.4" />
        ))}
      </g>

      {/* Animal bones */}
      <g transform="translate(230,210)" opacity="0.7">
        <line x1="-15" y1="0" x2="15" y2="0" stroke="#4A3A20" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="-15" cy="0" rx="3" ry="2" fill="#4A3A20" />
        <ellipse cx="15"  cy="0" rx="3" ry="2" fill="#4A3A20" />
        <line x1="-8" y1="-4" x2="-8" y2="4" stroke="#4A3A20" strokeWidth="1.5" />
        <line x1="0"  y1="-4" x2="0"  y2="4" stroke="#4A3A20" strokeWidth="1.5" />
        <line x1="8"  y1="-4" x2="8"  y2="4" stroke="#4A3A20" strokeWidth="1.5" />
      </g>

      {/* Lizard on rock */}
      <g transform="translate(253,201)">
        <ellipse rx="8" ry="4" fill="#5A7A30" />
        <ellipse cx="10" cy="0" rx="4.5" ry="3" fill="#5A7A30" />
        <path d="M -8 0 Q -16 3 -22 8" stroke="#5A7A30" strokeWidth="3" fill="none" strokeLinecap="round">
          <animate attributeName="d" values="M -8 0 Q -16 3 -22 8;M -8 0 Q -16 -1 -22 4;M -8 0 Q -16 3 -22 8" dur="2s" repeatCount="indefinite" />
        </path>
        <line x1="-4" y1="4"  x2="-7" y2="7"  stroke="#4A6A20" strokeWidth="1.5" />
        <line x1="4"  y1="4"  x2="8"  y2="7"  stroke="#4A6A20" strokeWidth="1.5" />
        <line x1="-4" y1="-4" x2="-7" y2="-7" stroke="#4A6A20" strokeWidth="1.5" />
        <line x1="4"  y1="-4" x2="8"  y2="-7" stroke="#4A6A20" strokeWidth="1.5" />
        <circle cx="12" cy="-1" r="1.5" fill="#FFCC00" />
        <circle cx="12.5" cy="-1.5" r="0.7" fill="#1A1A1A" />
      </g>

      {/* Scorpion */}
      <g transform="translate(168,215)">
        <ellipse rx="4" ry="3" fill="#3A2A10" />
        <path d="M -4 0 Q -8 -2 -9 -7 Q -9 -11 -7 -13" stroke="#3A2A10" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M -7 -13 Q -5 -15 -4 -13" stroke="#3A2A10" strokeWidth="1.5" fill="none" />
        <path d="M 4 2 L 7 5 M 7 5 L 6 7 M 7 5 L 9 6" stroke="#3A2A10" strokeWidth="0.9" fill="none" />
        <path d="M 4 -2 L 7 -5 M 7 -5 L 6 -7 M 7 -5 L 9 -4" stroke="#3A2A10" strokeWidth="0.9" fill="none" />
        {[2,0,-2].map((y,i) => (
          <g key={i}>
            <line x1="0" y1={y} x2="-4" y2={y+2} stroke="#3A2A10" strokeWidth="0.7" />
            <line x1="0" y1={y} x2="4"  y2={y+2} stroke="#3A2A10" strokeWidth="0.7" />
          </g>
        ))}
        <circle cx="4" cy="-1" r="0.8" fill="#FF4A00" opacity="0.85" />
        <circle cx="4" cy="1"  r="0.8" fill="#FF4A00" opacity="0.85" />
      </g>

      {/* Tumbleweed rolling */}
      <g>
        <animateMotion path="M -15 188 Q 100 162 210 188 Q 295 208 410 172" dur="14s" repeatCount="indefinite" />
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="3.5s" repeatCount="indefinite" />
          <circle r="10" fill="none" stroke="#7A5030" strokeWidth="1.5" />
          <path d="M -8 -6 Q 0 0 8 6"   stroke="#7A5030" strokeWidth="1" fill="none" />
          <path d="M -8 6 Q 0 0 8 -6"   stroke="#7A5030" strokeWidth="1" fill="none" />
          <path d="M 0 -10 Q 1 0 0 10"  stroke="#7A5030" strokeWidth="1" fill="none" />
          <path d="M -10 0 Q 0 1 10 0"  stroke="#7A5030" strokeWidth="1" fill="none" />
        </g>
      </g>

      {/* Second tumbleweed */}
      <g>
        <animateMotion path="M -10 208 Q 80 190 180 206 Q 280 225 410 195" dur="20s" begin="7s" repeatCount="indefinite" />
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="4.2s" repeatCount="indefinite" />
          <circle r="7" fill="none" stroke="#7A5030" strokeWidth="1.2" />
          <path d="M -6 -4 Q 0 0 6 4" stroke="#7A5030" strokeWidth="0.9" fill="none" />
          <path d="M -6 4 Q 0 0 6 -4" stroke="#7A5030" strokeWidth="0.9" fill="none" />
          <path d="M 0 -7 Q 1 0 0 7"  stroke="#7A5030" strokeWidth="0.9" fill="none" />
        </g>
      </g>

      {/* Vulture 1 */}
      <g opacity="0.72">
        <animateMotion path="M 60 48 Q 120 28 180 48 Q 240 68 300 48 Q 240 68 180 48 Q 120 28 60 48" dur="9s" repeatCount="indefinite" />
        <path d="M -17 0 Q -8 -6 0 -2 Q 8 -6 17 0" stroke="#2A1A0A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse cy="1" rx="3" ry="2" fill="#2A1A0A" />
        <circle cy="-3" r="2" fill="#3A1A1A" />
        <path d="M 1 -4 L 5 -3" stroke="#C8A020" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* Vulture 2 */}
      <g opacity="0.55">
        <animateMotion path="M 40 68 Q 110 46 190 66 Q 265 84 310 64 Q 265 84 190 66 Q 110 46 40 68" dur="13s" begin="4s" repeatCount="indefinite" />
        <g transform="scale(0.82)">
          <path d="M -15 0 Q -7 -5 0 -1 Q 7 -5 15 0" stroke="#2A1A0A" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cy="1" rx="2.5" ry="1.8" fill="#2A1A0A" />
          <circle cy="-3" r="1.8" fill="#3A1A1A" />
        </g>
      </g>

      {/* Dead grass */}
      {[{x:115,y:202,r:-15},{x:160,y:222,r:5},{x:242,y:220,r:-8},{x:262,y:212,r:12},
        {x:90,y:217,r:-5},{x:357,y:222,r:8},{x:30,y:232,r:-12},{x:355,y:235,r:5},
      ].map((g, i) => (
        <g key={i} transform={`translate(${g.x},${g.y}) rotate(${g.r})`}>
          <line x1="-3" y1="0" x2="-5" y2="-13" stroke="#4A3010" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="0"  y1="0" x2="0"  y2="-15" stroke="#4A3010" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="3"  y1="0" x2="5"  y2="-11" stroke="#4A3010" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      ))}

      {/* Dust particles */}
      {[{cx:118,cy:92},{cx:262,cy:86},{cx:152,cy:66},{cx:228,cy:74},{cx:192,cy:56},
        {cx:302,cy:122},{cx:78,cy:132},{cx:348,cy:102},{cx:38,cy:112}].map((p,i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="1.8" fill="#8B5E3C" opacity="0.38"
          className={`dust-particle dust-particle--${i % 3}`} />
      ))}

      {/* Heat shimmer */}
      {[108,132,158,184,210,236,262,288].map((x, i) => (
        <line key={i} x1={x} y1="48" x2={x+4} y2="92"
          stroke="rgba(255,140,0,0.09)" strokeWidth="1"
          className="heat-shimmer"
          style={{ animationDelay: `${i * 0.22}s` }} />
      ))}

      {/* Sand texture dots */}
      {Array.from({length: 30}).map((_,i) => (
        <circle key={i} cx={22 + (i*57+i*13) % 348} cy={228 + (i*37) % 28} r="0.7" fill="#5A3A1A" opacity="0.28" />
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────
// PUDDLE / TRICKLE SCENE  (rings 1)
// ─────────────────────────────────────────────────────────

function PuddleContent({ sid }: { sid: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`moonGlow-${sid}`} cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#E8E4D0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4A3A8A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Twilight sky */}
      <rect width="380" height="110" fill="#080618" />

      {/* Stars */}
      {[{x:28,y:18},{x:78,y:12},{x:132,y:7},{x:178,y:24},{x:232,y:10},{x:282,y:20},{x:342,y:7},{x:362,y:27},
        {x:52,y:42},{x:108,y:36},{x:198,y:42},{x:312,y:30},{x:12,y:55},{x:372,y:50},{x:155,y:55},{x:260,y:48}].map((s,i) => (
        <circle key={i} cx={s.x} cy={s.y} r={i%3===0?1.2:0.8} fill="white">
          <animate attributeName="opacity" values={i%2===0?"0.8;0.2;0.8":"0.3;0.9;0.3"}
            dur={`${1.8+(i%5)*0.6}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Moon + crescent */}
      <circle cx="48" cy="28" r="18" fill="#E8E4D0" opacity="0.28" />
      <circle cx="48" cy="28" r="14" fill="#D8D4B8" opacity="0.28" />
      <circle cx="57" cy="26" r="14" fill="#080618" opacity="0.88" />
      <circle cx="48" cy="28" r="26" fill={`url(#moonGlow-${sid})`} />

      {/* Ground */}
      <ellipse cx="190" cy="205" rx="195" ry="88" fill="#0C0E18" />
      <ellipse cx="190" cy="215" rx="178" ry="74" fill="#0E1020" />

      {/* Cracks */}
      {['M 78 148 Q 98 163 88 178 Q 76 195 98 210',
        'M 208 122 Q 226 146 216 166 Q 206 183 220 201',
        'M 286 160 Q 300 176 291 191',
        'M 148 210 Q 161 224 154 240',
        'M 246 206 Q 258 218 251 231',
        'M 52 178 Q 63 190 58 200',
        'M 338 170 Q 350 180 344 193',
        'M 175 230 Q 183 240 178 248',
      ].map((d, i) => (
        <path key={i} d={d} stroke="#080612" strokeWidth={i<3?1.4:0.9} fill="none" opacity="0.85" />
      ))}

      {/* Moss patches */}
      {[{cx:98,cy:178,rx:14,ry:6,op:0.55},{cx:278,cy:184,rx:11,ry:5,op:0.5},
        {cx:178,cy:232,rx:9,ry:4,op:0.45},{cx:335,cy:196,rx:8,ry:4,op:0.4}].map((m,i) => (
        <ellipse key={i} cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} fill="#1A3A1A" opacity={m.op} />
      ))}

      {/* ── PUDDLE 1 — large, center-left ── */}
      <ellipse cx="148" cy="168" rx="56" ry="30" fill="#0D3B6E" />
      <ellipse cx="148" cy="168" rx="46" ry="24" fill="rgba(21,80,160,0.45)" />
      <ellipse cx="134" cy="160" rx="22" ry="8" fill="rgba(220,216,190,0.15)" />
      {/* moon reflection shimmer */}
      <ellipse cx="145" cy="162" rx="10" ry="4" fill="rgba(220,216,190,0.18)">
        <animate attributeName="opacity" values="0.18;0.08;0.18" dur="3s" repeatCount="indefinite" />
      </ellipse>
      {[0,1.1].map((begin, i) => (
        <ellipse key={i} cx="148" cy="168" rx="22" ry="12" fill="none" stroke="rgba(66,153,225,0.55)" strokeWidth="1">
          <animate attributeName="rx" from="22" to="60" dur="2.4s" begin={`${begin}s`} repeatCount="indefinite" />
          <animate attributeName="ry" from="12" to="33" dur="2.4s" begin={`${begin}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2.4s" begin={`${begin}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
      {/* Lily pad */}
      <ellipse cx="163" cy="175" rx="11" ry="6.5" fill="#1E5A1A" opacity="0.88" />
      <line x1="163" y1="169" x2="163" y2="175" stroke="#1A4A18" strokeWidth="1" />
      <circle cx="163" cy="173" r="2.5" fill="#FFE060" opacity="0.85" />
      {/* Small fish in puddle */}
      <g transform="translate(152,172)">
        <ellipse cx="0" cy="0" rx="6" ry="3" fill="#1A6090" opacity="0.7" />
        <path d="M -6 0 L -10 -3 L -10 3 Z" fill="#1A6090" opacity="0.7" />
        <circle cx="4" cy="-0.5" r="1" fill="rgba(255,255,255,0.4)" />
      </g>

      {/* ── PUDDLE 2 — medium, right ── */}
      <ellipse cx="268" cy="158" rx="37" ry="21" fill="#0D3B6E" />
      <ellipse cx="262" cy="152" rx="13" ry="6" fill="rgba(0,229,204,0.12)" />
      <ellipse cx="268" cy="158" rx="15" ry="8" fill="none" stroke="rgba(66,153,225,0.45)" strokeWidth="1">
        <animate attributeName="rx" from="15" to="39" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="ry" from="8" to="22" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
      </ellipse>

      {/* ── PUDDLE 3 — small, lower ── */}
      <ellipse cx="195" cy="222" rx="22" ry="11" fill="#0D3B6E" opacity="0.88" />
      <ellipse cx="195" cy="222" rx="9" ry="5" fill="none" stroke="rgba(66,153,225,0.4)" strokeWidth="1">
        <animate attributeName="rx" from="9" to="24" dur="3.2s" begin="1.6s" repeatCount="indefinite" />
        <animate attributeName="ry" from="5" to="12" dur="3.2s" begin="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.35" to="0" dur="3.2s" begin="1.6s" repeatCount="indefinite" />
      </ellipse>

      {/* Heron — left of puddle 1 */}
      <g transform="translate(85,234)">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-2;0,0" dur="5s" repeatCount="indefinite" />
        <ellipse cx="0" cy="0" rx="4" ry="9" fill="#8ABCCC" transform="rotate(-5)" />
        <path d="M 0 -8 Q -3 -20 -1 -32 Q 1 -40 3 -46" stroke="#8ABCCC" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="4" cy="-49" r="5" fill="#7AABBB" />
        <line x1="7" y1="-51" x2="18" y2="-52" stroke="#C8A020" strokeWidth="2" strokeLinecap="round" />
        <circle cx="6" cy="-50" r="1.2" fill="#FF4A20" />
        <path d="M -1 8 L -1 26" stroke="#6A9BAB" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 2 8 L 2 26" stroke="#6A9BAB" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M -1 26 L -6 28 M -1 26 L 0 29 M 2 26 L 7 28 M 2 26 L 1 29" stroke="#6A9BAB" strokeWidth="1.2" />
      </g>

      {/* Frog 1 — at puddle 1 */}
      <g transform="translate(108,186)">
        <ellipse rx="9" ry="6" fill="#2A5A1A" />
        <circle cx="-3.5" cy="-5" r="4" fill="#2A5A1A" />
        <circle cx="3.5"  cy="-5" r="4" fill="#2A5A1A" />
        <circle cx="-3.5" cy="-6.5" r="2.5" fill="#88C030" />
        <circle cx="3.5"  cy="-6.5" r="2.5" fill="#88C030" />
        <ellipse cx="-3.5" cy="-6.5" rx="1" ry="1.5" fill="#0A1A0A" />
        <ellipse cx="3.5"  cy="-6.5" rx="1" ry="1.5" fill="#0A1A0A" />
        {/* blink */}
        <rect x="-6" y="-9" width="5" height="2.5" rx="1" fill="#2A5A1A" opacity="0">
          <animate attributeName="opacity" values="0;0;0;0;0;1;0" dur="4.2s" repeatCount="indefinite" />
        </rect>
        <rect x="1" y="-9" width="5" height="2.5" rx="1" fill="#2A5A1A" opacity="0">
          <animate attributeName="opacity" values="0;0;0;0;0;1;0" dur="4.2s" repeatCount="indefinite" />
        </rect>
        <ellipse cy="3" rx="5" ry="3" fill="#3A6A2A">
          <animate attributeName="ry" values="3;4.8;3" dur="2.2s" repeatCount="indefinite" />
        </ellipse>
        <path d="M -9 4 Q -14 8 -16 6 Q -18 4 -14 2" stroke="#2A5A1A" strokeWidth="2" fill="none" />
        <path d="M 9 4 Q 14 8 16 6 Q 18 4 14 2"  stroke="#2A5A1A" strokeWidth="2" fill="none" />
      </g>

      {/* Frog 2 — at puddle 2 */}
      <g transform="translate(240,168)">
        <ellipse rx="7.5" ry="5" fill="#2A5A1A" />
        <circle cx="-3" cy="-4.5" r="3.5" fill="#2A5A1A" />
        <circle cx="3"  cy="-4.5" r="3.5" fill="#2A5A1A" />
        <circle cx="-3" cy="-5.5" r="2.2" fill="#88C030" />
        <circle cx="3"  cy="-5.5" r="2.2" fill="#88C030" />
        <ellipse cx="-3" cy="-5.5" rx="0.9" ry="1.3" fill="#0A1A0A" />
        <ellipse cx="3"  cy="-5.5" rx="0.9" ry="1.3" fill="#0A1A0A" />
        <ellipse cy="3" rx="4" ry="2.5" fill="#3A6A2A">
          <animate attributeName="ry" values="2.5;3.8;2.5" dur="1.9s" begin="0.6s" repeatCount="indefinite" />
        </ellipse>
      </g>

      {/* Small frog 3 at puddle 3 */}
      <g transform="translate(180,232)">
        <ellipse rx="6" ry="4" fill="#2A5A1A" />
        <circle cx="-2.5" cy="-3.5" r="2.8" fill="#2A5A1A" />
        <circle cx="2.5"  cy="-3.5" r="2.8" fill="#2A5A1A" />
        <circle cx="-2.5" cy="-4.5" r="1.8" fill="#88C030" />
        <circle cx="2.5"  cy="-4.5" r="1.8" fill="#88C030" />
      </g>

      {/* Cattails / reeds */}
      {[{x:200,y:232,h:40,r:-5},{x:207,y:232,h:48,r:3},{x:322,y:202,h:34,r:-8},
        {x:328,y:202,h:40,r:4},{x:110,y:206,h:32,r:-3},{x:116,y:206,h:36,r:5},
        {x:158,y:220,h:28,r:7},{x:252,y:210,h:30,r:-6},
      ].map((r, i) => (
        <g key={i} transform={`translate(${r.x},${r.y})`}>
          <line x1="0" y1="0" x2={Math.sin(r.r*Math.PI/180)*r.h*0.12} y2={-r.h}
            stroke="#3A5A2A" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx={Math.sin(r.r*Math.PI/180)*r.h*0.12} cy={-r.h} rx="2.5" ry="5.5" fill="#5A3A1A" opacity="0.82" />
        </g>
      ))}

      {/* Sprouts through cracks */}
      {[{x:172,y:192},{x:222,y:187},{x:252,y:212},{x:138,y:212},
        {x:298,y:187},{x:342,y:200},{x:55,y:195},{x:358,y:215}].map((s,i) => (
        <g key={i} transform={`translate(${s.x},${s.y})`}>
          <path d="M 0 0 Q -3 -6 -2 -13" stroke="#2A5A1A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M -2 -9 Q -6 -11 -7 -8" stroke="#2A5A1A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M -2 -9 Q 2 -12 2 -8" stroke="#2A5A1A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* Dragonfly */}
      <g>
        <animateMotion path="M 185 202 Q 218 186 252 202 Q 218 218 185 202" dur="3.8s" repeatCount="indefinite" />
        <line x1="0" y1="-9" x2="0" y2="9" stroke="#2AAAD0" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="-7" cy="-2" rx="8" ry="3.5" fill="rgba(100,220,255,0.38)" stroke="rgba(100,220,255,0.6)" strokeWidth="0.5">
          <animate attributeName="ry" values="3.5;1.2;3.5" dur="0.1s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="7"  cy="-2" rx="8" ry="3.5" fill="rgba(100,220,255,0.38)" stroke="rgba(100,220,255,0.6)" strokeWidth="0.5">
          <animate attributeName="ry" values="3.5;1.2;3.5" dur="0.1s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="-6" cy="3" rx="6" ry="2.5" fill="rgba(100,220,255,0.28)" stroke="rgba(100,220,255,0.5)" strokeWidth="0.5">
          <animate attributeName="ry" values="2.5;0.8;2.5" dur="0.1s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="6"  cy="3" rx="6" ry="2.5" fill="rgba(100,220,255,0.28)" stroke="rgba(100,220,255,0.5)" strokeWidth="0.5">
          <animate attributeName="ry" values="2.5;0.8;2.5" dur="0.1s" repeatCount="indefinite" />
        </ellipse>
        <circle cy="-10" r="2.2" fill="#2AAAD0" />
      </g>

      {/* Fireflies */}
      {[{x:58,y:142,d:"5s"},{x:142,y:118,d:"4.2s"},{x:222,y:104,d:"6s"},
        {x:312,y:132,d:"3.8s"},{x:352,y:112,d:"5.5s"},{x:28,y:162,d:"4.8s"},
        {x:175,y:132,d:"7s"},{x:292,y:108,d:"3.5s"}].map((f,i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r="2.5" fill="#AAFF44">
            <animate attributeName="opacity" values="0;0;0.9;0.7;0;0" dur={f.d} repeatCount="indefinite" begin={`${i*0.72}s`} />
          </circle>
          <circle cx={f.x} cy={f.y} r="5.5" fill="rgba(170,255,68,0.28)">
            <animate attributeName="opacity" values="0;0;0.5;0.3;0;0" dur={f.d} repeatCount="indefinite" begin={`${i*0.72}s`} />
          </circle>
        </g>
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────
// SINGLE CIRCULAR RIVER CHANNEL — enriched with nature + wealth
// ─────────────────────────────────────────────────────────

interface RiverCfg {
  cx: number; cy: number;
  Rx: number; Ry: number;
  rx: number; ry: number;
  speed: number;
  coins: number;
  uid: string;
}

function SingleRiver({ cfg }: { cfg: RiverCfg }) {
  const { cx, cy, Rx, Ry, rx, ry, speed, coins, uid } = cfg;

  const outerArc = `M ${cx-Rx} ${cy} A ${Rx} ${Ry} 0 1 0 ${cx+Rx} ${cy} A ${Rx} ${Ry} 0 1 0 ${cx-Rx} ${cy} Z`;
  const innerArc = `M ${cx-rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx+rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx-rx} ${cy} Z`;
  const ringPath = `${outerArc} ${innerArc}`;

  const mrx = (Rx+rx)/2, mry = (Ry+ry)/2;
  const coinPath = `M ${cx-mrx} ${cy} A ${mrx} ${mry} 0 1 0 ${cx+mrx} ${cy} A ${mrx} ${mry} 0 1 0 ${cx-mrx} ${cy}`;
  const rotDur   = `${4/speed}s`;
  const coinDur  = 8/speed;
  const channelW = Rx - rx;

  // Bank decoration positions
  const vegAngles = [0,45,90,135,180,225,270,315];
  const vegSizes  = [4,5,3,6,4,5,3,6];

  // Tree positions on outer bank (angles in degrees where 90=bottom)
  const treeData = [
    { deg: 58,  s: 0.78 },
    { deg: 122, s: 0.72 },
    { deg: 305, s: 0.68 },
    { deg: 235, s: 0.75 },
  ].map(({ deg, s }) => {
    const rad = deg * Math.PI / 180;
    return { x: cx+(Rx+28)*Math.cos(rad), y: cy+(Ry+20)*Math.sin(rad), s };
  });

  // Deer position — lower-left bank
  const deerRad = 108 * Math.PI / 180;
  const deerX = cx + (Rx+18)*Math.cos(deerRad);
  const deerY = cy + (Ry+12)*Math.sin(deerRad);

  // Heron position — lower-right bank
  const heronRad = 72 * Math.PI / 180;
  const heronX = cx + (Rx+16)*Math.cos(heronRad);
  const heronY = cy + (Ry+10)*Math.sin(heronRad);

  return (
    <g>
      <defs>
        <clipPath id={`rc-${uid}`}>
          <path d={ringPath} fillRule="evenodd" />
        </clipPath>
      </defs>

      {/* Outer terrain */}
      <ellipse cx={cx} cy={cy} rx={Rx+26} ry={Ry+18} fill="#0A0E18" />
      <ellipse cx={cx} cy={cy} rx={Rx+16} ry={Ry+11} fill="#0D1220" />
      <ellipse cx={cx} cy={cy} rx={Rx+8}  ry={Ry+5}  fill="none"
        stroke="rgba(66,153,225,0.12)" strokeWidth="16" />

      {/* ── WATER ── */}
      <path d={ringPath} fill="#0B2E5A" fillRule="evenodd" />
      <path d={ringPath} fill="rgba(15,80,160,0.55)" fillRule="evenodd" />

      {/* Rotating flow highlight */}
      <g clipPath={`url(#rc-${uid})`}>
        <ellipse cx={cx} cy={cy} rx={mrx} ry={mry}
          fill="none" stroke="rgba(100,181,246,0.35)" strokeWidth={Math.max(12,channelW*0.75)}>
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={rotDur} repeatCount="indefinite" />
        </ellipse>
        <ellipse cx={cx} cy={cy} rx={mrx*0.78} ry={mry*0.78}
          fill="none" stroke="rgba(30,136,229,0.15)" strokeWidth={Math.max(6,channelW*0.3)}>
          <animateTransform attributeName="transform" type="rotate"
            from={`360 ${cx} ${cy}`} to={`0 ${cx} ${cy}`} dur={`${5.5/speed}s`} repeatCount="indefinite" />
        </ellipse>
        {/* Extra sparkle layer */}
        <ellipse cx={cx} cy={cy} rx={mrx*0.5} ry={mry*0.5}
          fill="none" stroke="rgba(200,230,255,0.08)" strokeWidth={Math.max(8,channelW*0.4)}>
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={`${3/speed}s`} repeatCount="indefinite" />
        </ellipse>
      </g>

      {/* Channel edge glows */}
      <ellipse cx={cx} cy={cy} rx={Rx} ry={Ry} fill="none" stroke="rgba(100,181,246,0.6)" strokeWidth="1.5" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="rgba(66,153,225,0.35)" strokeWidth="1" />

      {/* ── CENTER ISLAND ── */}
      <ellipse cx={cx} cy={cy} rx={rx-1}   ry={ry-0.5} fill="#0D1220" />
      <ellipse cx={cx} cy={cy} rx={rx-5}   ry={ry-3.5} fill="#0A0F1C" />
      <ellipse cx={cx} cy={cy} rx={rx-9}   ry={ry-6}   fill="#0C1118" />
      {/* Island rocks */}
      {[{dx:-rx*.44,dy:ry*.10,rw:5.5,rh:3.2},{dx:rx*.37,dy:-ry*.14,rw:4.5,rh:2.8},{dx:rx*.08,dy:ry*.42,rw:3.8,rh:2.2}]
        .map((v,i) => <ellipse key={i} cx={cx+v.dx} cy={cy+v.dy} rx={v.rw} ry={v.rh} fill="#1A2540" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />)}
      {/* Island foliage */}
      {[{dx:-rx*.22,dy:0,rw:8,rh:5,c:'#1A4A1E'},{dx:rx*.28,dy:ry*.2,rw:9,rh:5.5,c:'#1E5222'},
        {dx:0,dy:-ry*.35,rw:7,rh:4,c:'#173D1A'},{dx:-rx*.05,dy:ry*.35,rw:6,rh:3.5,c:'#1A4A1E'},
        {dx:rx*.1,dy:-ry*.15,rw:5,rh:3,c:'#245820'}].map((v,i) => (
        <ellipse key={i} cx={cx+v.dx} cy={cy+v.dy} rx={v.rw} ry={v.rh} fill={v.c} opacity="0.88" />
      ))}

      {/* ── BANK VEGETATION ── */}
      {vegAngles.map((deg, i) => {
        const rad = (deg*Math.PI)/180;
        const vx  = cx+(Rx+11)*Math.cos(rad), vy  = cy+(Ry+7.5)*Math.sin(rad);
        const sz  = vegSizes[i];
        const vx2 = cx+(Rx+19)*Math.cos(rad+0.18), vy2 = cy+(Ry+13)*Math.sin(rad+0.18);
        return (
          <g key={i}>
            <ellipse cx={vx}  cy={vy}  rx={sz+2.5} ry={sz*0.68} fill="#1C4A20" opacity="0.82" />
            <ellipse cx={vx2} cy={vy2} rx={sz+0.5} ry={sz*0.58} fill="#173C1A" opacity="0.68" />
          </g>
        );
      })}
      {/* Reeds */}
      {[28,95,155,225,288].map((deg, i) => {
        const rad=(deg*Math.PI)/180;
        const bx=cx+(Rx+1)*Math.cos(rad), by=cy+(Ry+0.5)*Math.sin(rad);
        return (
          <g key={i}>
            <line x1={bx} y1={by} x2={bx} y2={by-8} stroke="#2A5A30" strokeWidth="1.3" strokeLinecap="round" />
            <ellipse cx={bx} cy={by-8} rx="2" ry="3.8" fill="#2D5C2A" opacity="0.75" />
          </g>
        );
      })}
      {/* Bank rocks */}
      {[55,140,200,280,340].map((deg, i) => {
        const rad=(deg*Math.PI)/180;
        const bx=cx+(Rx+7)*Math.cos(rad), by=cy+(Ry+4.5)*Math.sin(rad);
        return <ellipse key={i} cx={bx} cy={by} rx={2+(i%2)} ry={1.5+(i%2)*0.5} fill="#1E2A3A" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />;
      })}

      {/* ── TREES ON BANK ── */}
      {treeData.map(({x,y,s},i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-3.5" y="-44" width="7" height="47" rx="3.5" fill="#3A2A14" />
          <ellipse cx="0"  cy="-52" rx="22" ry="16" fill="#1E5C1A" opacity="0.9" />
          <ellipse cx="-8" cy="-46" rx="17" ry="13" fill="#2A6B22" opacity="0.85" />
          <ellipse cx="9"  cy="-48" rx="16" ry="12" fill="#245A1E" opacity="0.85" />
          <ellipse cx="0"  cy="-58" rx="18" ry="11" fill="#1A5218" opacity="0.8" />
          {/* leaf highlight */}
          <ellipse cx="-4" cy="-54" rx="10" ry="5" fill="rgba(80,200,60,0.1)" />
          {/* subtle sway */}
          <animateTransform attributeName="transform" type="rotate"
            values="0;1.5;0;-1.5;0" dur={`${4.5+i*0.7}s`} repeatCount="indefinite" />
        </g>
      ))}

      {/* ── DEER at lower-left bank ── */}
      <g transform={`translate(${deerX} ${deerY})`}>
        <ellipse cx="0" cy="0" rx="13" ry="7" fill="#8B6030" />
        <path d="M 10 -4 Q 14 -8 14 -12" stroke="#8B6030" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="16" cy="-13" r="5.5" fill="#9A7040" />
        <ellipse cx="-12" cy="-1" rx="4" ry="5.5" fill="rgba(255,248,240,0.7)" />
        <line x1="-6" y1="7" x2="-7" y2="20" stroke="#7A5028" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="-1" y1="7" x2="-1" y2="20" stroke="#7A5028" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="5"  y1="7" x2="6"  y2="20" stroke="#7A5028" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="10" y1="7" x2="10" y2="20" stroke="#7A5028" strokeWidth="2.2" strokeLinecap="round" />
        {/* antlers */}
        <path d="M 16 -18 L 13 -26 L 9 -30" stroke="#6A4020" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M 13 -26 L 17 -28" stroke="#6A4020" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M 16 -18 L 19 -26 L 23 -30" stroke="#6A4020" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M 19 -26 L 15 -28" stroke="#6A4020" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="18" cy="-14" r="1.4" fill="#1A1A1A" />
        <circle cx="18.5" cy="-14.5" r="0.5" fill="white" />
        <ellipse cx="22" cy="-13" rx="2" ry="1.5" fill="#7A4020" />
        {/* gentle breathing */}
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-1;0,0" dur="4s" repeatCount="indefinite" />
      </g>

      {/* ── HERON at lower-right bank ── */}
      <g transform={`translate(${heronX} ${heronY})`}>
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-2;0,0" dur="5.5s" repeatCount="indefinite" />
        <ellipse cy="0" rx="4" ry="9" fill="#8ABCCC" transform="rotate(-5)" />
        <path d="M 0 -8 Q -2 -18 0 -30 Q 2 -38 4 -44" stroke="#8ABCCC" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <circle cx="5" cy="-47" r="5" fill="#7AABBB" />
        <line x1="8" y1="-49" x2="18" y2="-50" stroke="#C8A020" strokeWidth="2" strokeLinecap="round" />
        <circle cx="7" cy="-48.5" r="1.2" fill="#FF4A20" />
        <line x1="-2" y1="9" x2="-2" y2="26" stroke="#6A9BAB" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="2"  y1="9" x2="2"  y2="26" stroke="#6A9BAB" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M -2 26 L -7 28 M -2 26 L -1 29 M 2 26 L 7 28 M 2 26 L 1 29" stroke="#6A9BAB" strokeWidth="1.2" />
      </g>

      {/* ── BUTTERFLY 1 ── */}
      <g>
        <animateMotion
          path={`M ${cx-Rx-20} ${cy-Ry+5} Q ${cx-Rx+10} ${cy-Ry-18} ${cx} ${cy-Ry-5} Q ${cx+Rx-10} ${cy-Ry-18} ${cx+Rx+20} ${cy-Ry+5}`}
          dur={`${12/speed}s`} repeatCount="indefinite" />
        <ellipse cx="-4" cy="0" rx="5.5" ry="3.5" fill="rgba(255,165,0,0.7)" stroke="rgba(255,200,0,0.5)" strokeWidth="0.5">
          <animate attributeName="ry" values="3.5;1.5;3.5" dur="0.22s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="4"  cy="0" rx="5.5" ry="3.5" fill="rgba(255,165,0,0.7)" stroke="rgba(255,200,0,0.5)" strokeWidth="0.5">
          <animate attributeName="ry" values="3.5;1.5;3.5" dur="0.22s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="-3" cy="2.5" rx="3.5" ry="2.2" fill="rgba(255,120,0,0.5)">
          <animate attributeName="ry" values="2.2;0.8;2.2" dur="0.22s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="3"  cy="2.5" rx="3.5" ry="2.2" fill="rgba(255,120,0,0.5)">
          <animate attributeName="ry" values="2.2;0.8;2.2" dur="0.22s" repeatCount="indefinite" />
        </ellipse>
        <line x1="0" y1="-5" x2="0" y2="6" stroke="#3A1A00" strokeWidth="1.2" />
      </g>

      {/* ── BIRDS flying across ── */}
      <g opacity="0.7">
        <animateMotion
          path={`M ${cx-Rx-80} ${cy-Ry-20} L ${cx+Rx+80} ${cy-Ry-35}`}
          dur={`${18/speed}s`} repeatCount="indefinite" begin={`${2/speed}s`} />
        {[-14,-7,0,7,14].map((dx,i) => (
          <path key={i} d={`M ${dx-4} ${i%2===0?1:3} Q ${dx} -2 ${dx+4} ${i%2===0?1:3}`}
            stroke="#1A2A3A" strokeWidth="1.5" fill="none" />
        ))}
      </g>

      {/* ── FISH JUMPING ── */}
      <g opacity="0.8">
        <animateMotion
          path={`M ${cx+rx*0.4} ${cy} Q ${cx+rx*0.7} ${cy-Ry*1.2} ${cx+rx*0.4} ${cy}`}
          dur={`${6/speed}s`} begin={`${1.5/speed}s`} repeatCount="indefinite" />
        <g>
          <ellipse rx="5" ry="3" fill="#2A7090" opacity="0.9" />
          <path d="M -5 0 L -9 -3 L -9 3 Z" fill="#2A7090" opacity="0.9" />
          <circle cx="3" cy="-0.5" r="1" fill="rgba(255,255,255,0.5)" />
        </g>
      </g>

      {/* ── GOLD COINS (original) ── */}
      {Array.from({ length: coins }).map((_, i) => (
        <g key={i}>
          <circle r="4.5" fill="#F0B429" stroke="#B8760A" strokeWidth="0.8" />
          <circle r="2.5" fill="rgba(255,238,150,0.65)" />
          <animateMotion dur={`${coinDur}s`} begin={`${(i/coins)*coinDur}s`} repeatCount="indefinite" path={coinPath} />
        </g>
      ))}

      {/* ── MONEY BILLS ── */}
      {[0,1].map(i => (
        <g key={i}>
          <rect x="-10" y="-6" width="20" height="12" rx="1.5" fill="#1A5C2A" stroke="#0A3818" strokeWidth="0.5" opacity="0.92" />
          <rect x="-7"  y="-4" width="14" height="8"  fill="none" stroke="rgba(0,200,80,0.28)" strokeWidth="0.6" rx="0.8" />
          <line x1="-4" y1="-2" x2="4" y2="2"  stroke="rgba(0,200,80,0.22)" strokeWidth="0.8" />
          <line x1="-4" y1="2"  x2="4" y2="-2" stroke="rgba(0,200,80,0.22)" strokeWidth="0.8" />
          <animateMotion dur={`${coinDur*1.35}s`} begin={`${(i/2)*coinDur*1.35}s`} repeatCount="indefinite" path={coinPath} />
        </g>
      ))}

      {/* ── DIAMONDS ── */}
      {[0,1].map(i => (
        <g key={i}>
          <polygon points="0,-7 7,0 0,7 -7,0" fill="#64B5F6" stroke="#90CAF9" strokeWidth="0.6" opacity="0.92" />
          <polygon points="0,-4 4,0 0,4 -4,0" fill="rgba(255,255,255,0.55)" />
          <polygon points="0,-7 7,0 0,7 -7,0" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5">
            <animate attributeName="opacity" values="0.35;0.9;0.35" dur="1.5s" repeatCount="indefinite" />
          </polygon>
          <animateMotion dur={`${coinDur*0.88}s`} begin={`${(coinDur*0.88/2)*i + coinDur*0.22}s`} repeatCount="indefinite" path={coinPath} />
        </g>
      ))}

      {/* ── GOLD BARS ── */}
      {[0].map(i => (
        <g key={i}>
          <rect x="-9" y="-5" width="18" height="10" rx="2" fill="#F0B429" stroke="#B8760A" strokeWidth="0.6" opacity="0.92" />
          <rect x="-6" y="-3" width="12" height="6"  fill="rgba(255,238,150,0.42)" rx="1" />
          <animateMotion dur={`${coinDur*1.15}s`} begin={`${coinDur*0.55}s`} repeatCount="indefinite" path={coinPath} />
        </g>
      ))}

      {/* ── RUBY / GEM ── */}
      <g>
        <polygon points="0,-5 4,0 0,5 -4,0" fill="#E53935" stroke="#FF6B6B" strokeWidth="0.5" opacity="0.9" />
        <polygon points="0,-3 2.5,0 0,3 -2.5,0" fill="rgba(255,180,180,0.5)" />
        <animate attributeName="opacity" values="0.9;0.6;0.9" dur="1.2s" repeatCount="indefinite" />
        <animateMotion dur={`${coinDur*1.05}s`} begin={`${coinDur*0.78}s`} repeatCount="indefinite" path={coinPath} />
      </g>

      {/* Water surface shimmer particles */}
      {Array.from({length:4}).map((_,i) => {
        const sRad = (i*90+45)*Math.PI/180;
        const sx = cx+mrx*0.7*Math.cos(sRad), sy = cy+mry*0.7*Math.sin(sRad);
        return (
          <circle key={i} cx={sx} cy={sy} r="1.5" fill="rgba(200,230,255,0.5)">
            <animate attributeName="opacity" values="0.5;0;0.5" dur={`${1+i*0.5}s`} repeatCount="indefinite" />
            <animate attributeName="r" values="1.5;2.5;1.5" dur={`${1+i*0.5}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </g>
  );
}

// ─────────────────────────────────────────────────────────
// RIVER CONTENT — places rivers for each ring level
// ─────────────────────────────────────────────────────────

const RIVER_CFG: Record<number, Omit<RiverCfg, 'cx'|'cy'|'uid'>> = {
  2: { Rx:112, Ry:70, rx:68, ry:40, speed:0.8,  coins:3 },
  3: { Rx:135, Ry:85, rx:55, ry:32, speed:1.2,  coins:4 },
  4: { Rx:112, Ry:70, rx:65, ry:38, speed:1.65, coins:5 },
  5: { Rx:112, Ry:70, rx:65, ry:38, speed:2.1,  coins:6 },
};

function RiverContent({ rings }: { rings: number }) {
  const cfg = RIVER_CFG[rings] ?? RIVER_CFG[5];
  const CX = 190, CY = 130;
  const positions: {cx:number;cy:number}[] =
    rings === 4 ? [{cx:CX-215,cy:CY},{cx:CX+215,cy:CY}]
    : rings >= 5 ? [{cx:CX,cy:CY-170},{cx:CX-215,cy:CY+98},{cx:CX+215,cy:CY+98}]
    : [{cx:CX,cy:CY}];

  return (
    <g>
      {positions.map((pos, i) => (
        <SingleRiver key={i}
          cfg={{...cfg, cx:pos.cx, cy:pos.cy, speed:cfg.speed*(1+i*0.12), uid:`rv${rings}-${i}`}} />
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────
// SCENE CANVAS — unified zoom/pan for ALL ring levels
// ─────────────────────────────────────────────────────────

function SceneCanvas({ rings, sid }: { rings: number; sid: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const defaultZoom = rings >= 5 ? 0.43 : rings === 4 ? 0.57 : rings === 3 ? 0.88 : 0.82;
  const [zoom, setZoom] = useState(defaultZoom);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const dragging  = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.2, Math.min(2.8, z * (e.deltaY < 0 ? 1.12 : 0.9))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - lastMouse.current.x) / rect.width)  * 380 / zoom;
    const dy = ((e.clientY - lastMouse.current.y) / rect.height) * 260 / zoom;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };
  const stopDrag = () => { dragging.current = false; };

  const CX = 190, CY = 130;
  const transform = `translate(${CX+pan.x} ${CY+pan.y}) scale(${zoom}) translate(${-CX} ${-CY})`;
  const bgColor   = rings === 0 ? '#1C0D04' : rings === 1 ? '#080618' : '#090E18';

  return (
    <div
      className="river-scene river-scene--pan"
      style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <svg ref={svgRef} viewBox="0 0 380 260" className="river-svg" style={{ overflow: 'visible' }}>
        <rect width="380" height="260" fill={bgColor} />
        <g transform={transform}>
          {rings === 0 ? <DryBedContent sid={sid} />
            : rings === 1 ? <PuddleContent sid={sid} />
            : <RiverContent rings={rings} />}
        </g>
      </svg>
      <div className="river-scene__hint">scroll to zoom · drag to explore</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CARTOON CHARACTER (overlay — 20% smaller)
// ─────────────────────────────────────────────────────────

function CartoonCharacter({ tier }: { tier: ReturnType<typeof getTier> }) {
  const smile   = tier.riverRings >= 3;
  const neutral = tier.riverRings === 1 || tier.riverRings === 2;

  return (
    <div className="character-wrap">
      <motion.div
        className="character"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
      >
        <svg viewBox="0 0 90 120" className="character-svg">
          <ellipse cx="45" cy="116" rx="26" ry="5" fill="rgba(0,0,0,0.4)" />
          <ellipse cx="27" cy="108" rx="13" ry="7" fill="#1A2A6C" />
          <ellipse cx="63" cy="108" rx="13" ry="7" fill="#1A2A6C" />
          <ellipse cx="23" cy="105" rx="5" ry="2.5" fill="rgba(255,255,255,0.15)" />
          <ellipse cx="59" cy="105" rx="5" ry="2.5" fill="rgba(255,255,255,0.15)" />
          <path d="M 32 78 Q 28 94 28 108" stroke="#2D4A9E" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M 58 78 Q 62 94 62 108" stroke="#2D4A9E" strokeWidth="9" strokeLinecap="round" fill="none" />
          <rect x="22" y="46" width="46" height="36" rx="10" fill="#4C6EF5" />
          <ellipse cx="45" cy="56" rx="14" ry="5" fill="rgba(0,0,0,0.15)" />
          <line x1="45" y1="50" x2="45" y2="78" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M 26 52 Q 30 48 38 47" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 22 56 Q 10 66 8 78" stroke="#4C6EF5" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M 22 56 Q 10 66 8 78" stroke="rgba(0,0,0,0.2)"  strokeWidth="5"  strokeLinecap="round" fill="none" />
          <path d="M 0 77 L 4 91 L 17 91 L 20 77 Z" fill="#F0A020" />
          <path d="M 0 77 L 4 91 L 17 91 L 20 77 Z" fill="rgba(255,255,255,0.15)" />
          <rect x="-1" y="74" width="22" height="5" rx="2.5" fill="#D4890A" />
          <path d="M 2 74 Q 10 65 18 74" stroke="#A06000" strokeWidth="2" fill="none" strokeLinecap="round" />
          <clipPath id="bucketClip">
            <path d="M 1 78 L 4 91 L 17 91 L 19 78 Z" />
          </clipPath>
          <rect x="1" y="78" width="18" height="13" fill="rgba(0,200,180,0.8)" clipPath="url(#bucketClip)"
            className="bucket-water" />
          <path d="M 68 56 Q 80 62 82 74" stroke="#4C6EF5" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M 68 56 Q 80 62 82 74" stroke="rgba(0,0,0,0.2)"  strokeWidth="5"  strokeLinecap="round" fill="none" />
          <rect x="38" y="38" width="14" height="12" rx="4" fill="#FFCC70" />
          <circle cx="45" cy="24" r="21" fill="#FFDB7E" />
          <defs>
            <radialGradient id="headGrad" cx="40%" cy="35%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(200,130,0,0.15)" />
            </radialGradient>
          </defs>
          <circle cx="45" cy="24" r="21" fill="url(#headGrad)" />
          <circle cx="45" cy="24" r="21" fill="none" stroke="#D4A030" strokeWidth="1.2" />
          <path d="M 26 16 Q 30 4 45 3 Q 60 3 64 16" fill="#5A3A00" />
          <path d="M 26 16 Q 24 10 28 6" fill="#5A3A00" />
          <path d="M 64 16 Q 66 10 62 6" fill="#5A3A00" />
          <path d="M 32 8 Q 40 4 50 6" stroke="rgba(255,210,100,0.3)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="36" cy="21" rx="5"   ry="5.5" fill="white" />
          <circle  cx="37" cy="22" r="3.2"  fill="#1A1A2E" />
          <circle  cx="38" cy="21" r="1.2"  fill="white" />
          <ellipse cx="54" cy="21" rx="5"   ry="5.5" fill="white" />
          <circle  cx="55" cy="22" r="3.2"  fill="#1A1A2E" />
          <circle  cx="56" cy="21" r="1.2"  fill="white" />
          {smile || neutral ? (
            <>
              <path d="M 31 14 Q 36 11 41 14" stroke="#5A3A00" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 49 14 Q 54 11 59 14" stroke="#5A3A00" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M 31 14 Q 36 17 41 14" stroke="#5A3A00" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 49 14 Q 54 17 59 14" stroke="#5A3A00" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          )}
          {smile ? (
            <>
              <path d="M 37 32 Q 45 40 53 32" stroke="#A0600A" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 37 32 Q 45 38 53 32" fill="rgba(200,80,80,0.3)" />
            </>
          ) : neutral ? (
            <line x1="38" y1="34" x2="52" y2="34" stroke="#A0600A" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M 38 37 Q 45 31 52 37" stroke="#A0600A" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
          {smile && (
            <>
              <ellipse cx="30" cy="30" rx="5" ry="3" fill="rgba(255,120,120,0.3)" />
              <ellipse cx="60" cy="30" rx="5" ry="3" fill="rgba(255,120,120,0.3)" />
            </>
          )}
        </svg>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FLOWING RIVER SCENE — scene canvas + sticky corner character
// ─────────────────────────────────────────────────────────

function FlowingRiverScene({ ringCount, tier, sid }: {
  ringCount: number;
  tier: ReturnType<typeof getTier>;
  sid: string;
}) {
  return (
    <div className="river-scene-wrap">
      <SceneCanvas rings={ringCount} sid={sid} />
      <div className="river-character-overlay">
        <CartoonCharacter tier={tier} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// OPTIMAL RIVER MODAL
// ─────────────────────────────────────────────────────────

function OptimalRiverModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="optimal-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="optimal-modal__header">
          <span>✦</span>
          <h2>The Optimal River</h2>
        </div>

        {/* Mini river scene */}
        <div className="optimal-modal__scene">
          <FlowingRiverScene ringCount={5} tier={getTier(1_000_000)} sid="modal" />
        </div>

        {/* The rule */}
        <div className="optimal-modal__rule">
          <span className="optimal-modal__rule-text">Passive Income</span>
          <span className="optimal-modal__rule-gte">≥</span>
          <span className="optimal-modal__rule-text">All Lifestyle Expenses</span>
        </div>

        {/* Educational flow diagram */}
        <div className="optimal-modal__diagram">
          <div className="oflow-node oflow-node--bucket">
            <div className="oflow-node__icon"><BucketSVG /></div>
            <div className="oflow-node__label">Active Income</div>
            <div className="oflow-node__sub">Job, business, freelance</div>
          </div>
          <div className="oflow-arrow">
            <svg width="28" height="16" viewBox="0 0 28 16">
              <path d="M 0 8 L 20 8 M 14 2 L 22 8 L 14 14"
                stroke="#F0B429" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Buy assets</span>
          </div>
          <div className="oflow-node oflow-node--river">
            <div className="oflow-node__icon"><RiverMiniSVG /></div>
            <div className="oflow-node__label">Your River</div>
            <div className="oflow-node__sub">Investments, real estate</div>
          </div>
          <div className="oflow-arrow">
            <svg width="28" height="16" viewBox="0 0 28 16">
              <path d="M 0 8 L 20 8 M 14 2 L 22 8 L 14 14"
                stroke="#00E5CC" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Flows back</span>
          </div>
          <div className="oflow-node oflow-node--free">
            <div className="oflow-node__icon"><FreedomFaceSVG /></div>
            <div className="oflow-node__label">Financial Freedom</div>
            <div className="oflow-node__sub">Passive ≥ Expenses</div>
          </div>
        </div>

        {/* What helps vs hurts */}
        <div className="optimal-modal__flows">
          <div className="flow-row">
            <div className="flow-dot flow-dot--green" />
            <span><strong>Assets grow the river</strong> — investments, rental income, dividends</span>
          </div>
          <div className="flow-row">
            <div className="flow-dot flow-dot--red" />
            <span><strong>Liabilities drain the river</strong> — cars, subscriptions, lifestyle debt</span>
          </div>
        </div>

        <blockquote className="optimal-modal__quote">
          "Make thy gold multiply as the flocks in the field — let passive income
          flow faster than thy spending drains it." — Arkad
        </blockquote>

        <button className="optimal-modal__close btn-secondary" onClick={onClose}>Close</button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// NET WORTH PANEL (left)
// ─────────────────────────────────────────────────────────

function NetWorthPanel() {
  const { user } = useAuth();
  const { data: nw, isLoading: nwLoading } = useNetWorth();
  const [showTotal, setShowTotal]           = useState(false);
  const [period, setPeriod]                 = useState<TimePeriod>('6M');
  const [scrubbedIndex, setScrubIndex]      = useState<number | null>(null);

  const lastYear = new Date().getFullYear() - 1;
  const { data: annualSummary } = useAnnualSummary(lastYear);

  const displayKey: 'liquidNetWorth' | 'totalNetWorth' = showTotal ? 'totalNetWorth' : 'liquidNetWorth';

  const currentValue = nw ? nw[displayKey] : 0;

  const { data: historyData = [], isLoading: histLoading } = useNetWorthHistory(period);

  // Scrub-aware display value
  const scrubbedValue = scrubbedIndex != null ? (historyData[scrubbedIndex]?.[displayKey] ?? null) : null;
  const displayValue  = scrubbedValue ?? currentValue;

  // Delta computation
  let delta        = 0;
  let deltaPercent = 0;
  let deltaLabel   = 'Today';

  if (scrubbedIndex != null && historyData.length > 0) {
    const base   = historyData[0][displayKey];
    delta        = displayValue - base;
    deltaPercent = base !== 0 ? (delta / Math.abs(base)) * 100 : 0;
    const startDate = new Date(historyData[0].snapshotDate)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    deltaLabel = `since ${startDate}`;
  } else if (historyData.length >= 2) {
    const prev   = historyData[historyData.length - 2][displayKey];
    delta        = currentValue - prev;
    deltaPercent = prev !== 0 ? (delta / Math.abs(prev)) * 100 : 0;
    deltaLabel   = 'vs. yesterday';
  }

  const accentColor = delta >= 0 ? '#00E676' : '#FF4458';
  const displayName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there';

  const scrubbedPoint   = scrubbedIndex != null ? historyData[scrubbedIndex] : null;
  const scrubDateLabel  = scrubbedPoint
    ? new Date(scrubbedPoint.snapshotDate)
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const scrubAnnotation = scrubbedPoint?.annotation ?? null;

  const queryClient = useQueryClient();

  // ── Add Note state ──
  const [showAddNote,   setShowAddNote]   = useState(false);
  const [noteText,      setNoteText]      = useState('');
  const [noteDate,      setNoteDate]      = useState('');

  // Snapshot options for the date picker — exclude dates that already have a note
  const snapshotOptions = historyData.filter(p => !p.annotation);
  const latestSnapshot  = historyData[historyData.length - 1] ?? null;

  const openAddNote = () => {
    const defaultDate = snapshotOptions[snapshotOptions.length - 1]?.snapshotDate ?? latestSnapshot?.snapshotDate ?? '';
    setNoteDate(defaultDate);
    setNoteText('');
    setShowAddNote(true);
  };

  const annotateMutation = useMutation({
    mutationFn: ({ date, text }: { date: string; text: string }) =>
      annotateNetWorth(date, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networth', 'history'] });
      setShowAddNote(false);
      setNoteText('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAnnotation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['networth', 'history'] }),
  });

  const handleSaveNote = () => {
    if (!noteDate || !noteText.trim()) return;
    annotateMutation.mutate({ date: noteDate, text: noteText.trim() });
  };

  // ── View note state (shown next to date label when scrubbing an annotated point) ──
  const [showNotePopover, setShowNotePopover] = useState(false);

  return (
    <div className="nw-panel">
      <div className="nw-panel__greeting">
        <div className="nw-panel__eyebrow">Portfolio Overview</div>
        <div className="nw-panel__hello-wrap">
          <div className="nw-panel__hello">Hello, {displayName}</div>
        </div>
      </div>

      {nw?.hasProperties && (
        <div className="toggle-group">
          <button className={`toggle-pill${!showTotal?' toggle-pill--active':''}`} onClick={() => setShowTotal(false)}>Liquid NW</button>
          <button className={`toggle-pill${showTotal?' toggle-pill--active':''}`}  onClick={() => setShowTotal(true)}>Total NW</button>
        </div>
      )}

      {/* Scrub date label + note indicator */}
      <div className="nw-panel__scrub-date-row">
        <span className="nw-panel__scrub-date">
          {scrubDateLabel ?? 'Net Worth'}
        </span>
        {scrubAnnotation && scrubbedPoint && (
          <button
            className="nw-panel__note-chip"
            onClick={() => setShowNotePopover(v => !v)}
            title="View note"
          >
            🚩 Note
          </button>
        )}
      </div>

      {/* Note popover — shows when chip is clicked */}
      <AnimatePresence>
        {showNotePopover && scrubAnnotation && scrubbedPoint && (
          <motion.div
            className="nw-panel__note-popover"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
          >
            <p className="nw-panel__note-popover-text">{scrubAnnotation}</p>
            <button
              className="nw-panel__note-delete"
              onClick={() => {
                if (!window.confirm('Delete this note?')) return;
                deleteMutation.mutate(scrubbedPoint.snapshotDate);
                setShowNotePopover(false);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete note'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrub-aware value — no remount key so the number updates in-place */}
      <div className="nw-panel__value-row">
        <div className="nw-panel__value nw-panel__value--scrub">
          {nwLoading ? '—' : formatCurrency(displayValue)}
        </div>
      </div>

      {/* Delta row */}
      <div className={`nw-panel__delta${delta >= 0 ? ' nw-panel__delta--up' : ' nw-panel__delta--down'}`}>
        <span className="nw-panel__delta-amount">{formatDelta(delta)}</span>
        <span className="nw-panel__delta-pct">({formatPercent(deltaPercent)})</span>
        <span className="nw-panel__delta-label">{deltaLabel}</span>
      </div>

      {/* Chart */}
      <div className="nw-panel__chart-wrap">
        <NetWorthChart
          data={historyData}
          isLoading={histLoading}
          hasProperties={nw?.hasProperties ?? false}
          displayKey={displayKey}
          accentColor={accentColor}
          period={period}
          scrubbedIndex={scrubbedIndex}
          onScrubIndex={setScrubIndex}
        />
      </div>

      {/* Period selector + Add Note */}
      <div className="nw-panel__chart-footer">
        <div className="period-selector">
          {(['1W','1M','3M','6M','1Y','ALL'] as TimePeriod[]).map(p => (
            <button key={p}
              className={`period-pill${period === p ? ' period-pill--active' : ''}`}
              onClick={() => { setPeriod(p); setScrubIndex(null); }}>
              {p}
            </button>
          ))}
        </div>
        {snapshotOptions.length > 0 && (
          <button className="btn-add-note" onClick={openAddNote} title="Add a note to a snapshot">
            + Note
          </button>
        )}
      </div>

      {/* Add Note modal */}
      <AnimatePresence>
        {showAddNote && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} onClick={() => setShowAddNote(false)}>
            <motion.div className="add-note-modal" onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}>
              <div className="add-note-modal__title">🚩 Add Note</div>
              <div className="add-note-modal__date-picker">
                <label>Snapshot date</label>
                <select value={noteDate} onChange={e => setNoteDate(e.target.value)}>
                  {snapshotOptions.map(p => (
                    <option key={p.snapshotDate} value={p.snapshotDate}>
                      {new Date(p.snapshotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="add-note-modal__input"
                placeholder="What happened to your net worth on this date?"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="add-note-modal__actions">
                <button className="btn-secondary" onClick={() => setShowAddNote(false)}>Cancel</button>
                <button className="btn-primary"
                  disabled={!noteText.trim() || annotateMutation.isPending}
                  onClick={handleSaveNote}>
                  {annotateMutation.isPending ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {nw && (
        <div className="stats-row">
          <div className="stat-chip stat-chip--pos">
            <div className="stat-chip__label">Assets</div>
            <div className="stat-chip__value">{formatCurrency(nw.totalAssets)}</div>
          </div>
          <div className="stat-chip stat-chip--neg">
            <div className="stat-chip__label">Liabilities</div>
            <div className="stat-chip__value">{formatCurrency(nw.totalLiabilities)}</div>
          </div>
          {nw.creditUtilizationPercent != null && (
            <div className="stat-chip">
              <div className="stat-chip__label">Credit Used</div>
              <div className="stat-chip__value">{nw.creditUtilizationPercent.toFixed(1)}%</div>
            </div>
          )}
        </div>
      )}

      {/* Annual Summary Callout */}
      {annualSummary && (
        <div className={`annual-callout${annualSummary.netSavings >= 0 ? '' : ' annual-callout--neg'}`}>
          <div className="annual-callout__year">{lastYear} Summary</div>
          <div className="annual-callout__body">
            {annualSummary.netSavings >= 0 ? (
              <>
                Your river grew{' '}
                <strong>{formatCurrency(annualSummary.netSavings)}</strong> last year
                {annualSummary.savingsRate > 0 && (
                  <> · <span className="annual-callout__rate">
                    {(annualSummary.savingsRate * 100).toFixed(1)}% savings rate
                  </span></>
                )}
              </>
            ) : (
              <>
                River shrank by{' '}
                <strong>{formatCurrency(Math.abs(annualSummary.netSavings))}</strong> last year
                {' '}· Save more to grow your river
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RIVER MEANING MODAL
// ─────────────────────────────────────────────────────────

function BucketSVG() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Water drops falling */}
      <circle cx="26" cy="8" r="2.5" fill="#00E676" opacity="0.7">
        <animate attributeName="cy" values="8;16;8" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="21" cy="5" r="2" fill="#00E676" opacity="0.5">
        <animate attributeName="cy" values="5;14;5" dur="2.2s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.05;0.5" dur="2.2s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="31" cy="6" r="1.5" fill="#00E676" opacity="0.5">
        <animate attributeName="cy" values="6;15;6" dur="2s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.05;0.5" dur="2s" begin="0.9s" repeatCount="indefinite" />
      </circle>
      {/* Bucket body */}
      <path d="M 14 20 L 16 44 Q 16 46 18 46 L 34 46 Q 36 46 36 44 L 38 20 Z"
        fill="#1B7A6E" stroke="#00E5CC" strokeWidth="1.5" />
      {/* Water fill (animated) */}
      <clipPath id="bucketClip">
        <path d="M 14 20 L 16 44 Q 16 46 18 46 L 34 46 Q 36 46 36 44 L 38 20 Z" />
      </clipPath>
      <rect x="13" y="30" width="26" height="17" fill="#00E676" opacity="0.35" clipPath="url(#bucketClip)">
        <animate attributeName="y" values="30;28;30" dur="2s" repeatCount="indefinite" />
      </rect>
      <path d="M 13 32 Q 20 29 26 32 Q 32 35 39 32" stroke="#00E676" strokeWidth="1" fill="none" opacity="0.6">
        <animate attributeName="d"
          values="M 13 32 Q 20 29 26 32 Q 32 35 39 32;M 13 30 Q 20 33 26 30 Q 32 27 39 30;M 13 32 Q 20 29 26 32 Q 32 35 39 32"
          dur="2s" repeatCount="indefinite" />
      </path>
      {/* Handle */}
      <path d="M 17 20 Q 26 13 35 20" stroke="#00E5CC" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Top rim */}
      <rect x="13" y="19" width="26" height="3" rx="1.5" fill="#00A896" />
    </svg>
  );
}

function RiverMiniSVG() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <ellipse cx="26" cy="30" rx="22" ry="14" fill="none" stroke="#00E5CC" strokeWidth="1.5" opacity="0.8">
        <animate attributeName="rx" values="22;23;22" dur="3s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="26" cy="30" rx="15" ry="9" fill="none" stroke="#00E5CC" strokeWidth="1.5" opacity="0.65">
        <animate attributeName="rx" values="15;16;15" dur="2.5s" begin="0.4s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="26" cy="30" rx="8" ry="5" fill="none" stroke="#00E5CC" strokeWidth="1.5" opacity="0.5">
        <animate attributeName="rx" values="8;9;8" dur="2s" begin="0.8s" repeatCount="indefinite" />
      </ellipse>
      <circle cx="26" cy="30" r="2.5" fill="#00E5CC" opacity="0.4" />
      {/* Coins orbiting */}
      <circle cx="26" cy="16" r="2.5" fill="#F0B429">
        <animateMotion dur="4s" repeatCount="indefinite">
          <mpath href="#orbitPath" />
        </animateMotion>
      </circle>
      <defs>
        <path id="orbitPath" d="M 0 -14 A 22 14 0 1 1 -0.1 -14" />
      </defs>
      {/* Money sign */}
      <text x="22" y="33" fill="#F0B429" fontSize="9" fontWeight="bold" opacity="0.7">$</text>
    </svg>
  );
}

function FreedomFaceSVG() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Sun rays */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = deg * Math.PI / 180;
        return (
          <line key={i}
            x1={26 + 19 * Math.cos(rad)} y1={26 + 19 * Math.sin(rad)}
            x2={26 + 24 * Math.cos(rad)} y2={26 + 24 * Math.sin(rad)}
            stroke="#FFD047" strokeWidth="1.8" strokeLinecap="round" opacity="0.65">
            <animate attributeName="opacity" values="0.65;1;0.65" dur={`${1.5 + i*0.1}s`} repeatCount="indefinite" />
          </line>
        );
      })}
      {/* Face circle */}
      <circle cx="26" cy="26" r="15" fill="#FFD047" />
      <circle cx="26" cy="26" r="15" fill="url(#faceGrad)" />
      <defs>
        <radialGradient id="faceGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#FFE272" />
          <stop offset="100%" stopColor="#F0B429" />
        </radialGradient>
      </defs>
      {/* Eyes — happy closed curves */}
      <path d="M 21 24 Q 22.5 22 24 24" stroke="#7A4A00" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M 28 24 Q 29.5 22 31 24" stroke="#7A4A00" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Big smile */}
      <path d="M 20 28 Q 26 35 32 28" stroke="#7A4A00" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Rosy cheeks */}
      <circle cx="20" cy="30" r="3" fill="#FF9090" opacity="0.3" />
      <circle cx="32" cy="30" r="3" fill="#FF9090" opacity="0.3" />
      {/* Small coin floating */}
      <circle cx="42" cy="10" r="4" fill="#F0B429" opacity="0.9">
        <animate attributeName="cy" values="10;8;10" dur="2s" repeatCount="indefinite" />
      </circle>
      <text x="40" y="13" fill="#7A4A00" fontSize="6" fontWeight="bold">$</text>
    </svg>
  );
}

function RiverMeaningModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="meaning-modal" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>

        <div className="meaning-modal__title">
          <span className="meaning-modal__title-icon">🌊</span>
          What does the river mean?
        </div>

        <p className="meaning-modal__intro">
          In <em>The Richest Man in Babylon</em>, Arkad teaches that your active income is water
          you carry in a bucket — you work, you fill it, you spend it, and it empties. True wealth
          comes from pouring that water into a river: investments and assets that flow on their own.
          When your river runs strong enough, it fills your bucket for you — and you are no longer
          dependent on a job to survive. You are free.
        </p>

        <div className="meaning-steps">
          {/* Step 1 */}
          <div className="meaning-step meaning-step--bucket">
            <div className="meaning-step__graphic"><BucketSVG /></div>
            <div className="meaning-step__body">
              <div className="meaning-step__label">Step 1 · Earn</div>
              <div className="meaning-step__title">Fill your bucket</div>
              <div className="meaning-step__desc">
                Your job or business is the bucket — it fills with active income every month.
                But a bucket with a hole drains fast if spent on liabilities.
              </div>
            </div>
          </div>

          <div className="meaning-connector">↓</div>

          {/* Step 2 */}
          <div className="meaning-step meaning-step--river">
            <div className="meaning-step__graphic"><RiverMiniSVG /></div>
            <div className="meaning-step__body">
              <div className="meaning-step__label">Step 2 · Invest</div>
              <div className="meaning-step__title">Pour into the river</div>
              <div className="meaning-step__desc">
                <strong className="meaning-asset-label">Assets</strong> put money in your pocket (investments, rental income).{' '}
                <strong style={{ color: 'var(--color-negative)' }}>Liabilities</strong> take money out (cars, clothes, subscriptions).
                Buy assets — not liabilities.
              </div>
            </div>
          </div>

          <div className="meaning-connector">↓</div>

          {/* Step 3 */}
          <div className="meaning-step meaning-step--free">
            <div className="meaning-step__graphic"><FreedomFaceSVG /></div>
            <div className="meaning-step__body">
              <div className="meaning-step__label">Step 3 · Flow free</div>
              <div className="meaning-step__title">Live off the river</div>
              <div className="meaning-step__desc">
                When your river (passive income) covers your expenses, you never run out of money —
                even if the bucket stops.
              </div>
            </div>
          </div>
        </div>

        <p className="meaning-modal__tagline">
          "A part of all you earn is yours to keep." — Arkad
        </p>

        <button className="btn-secondary meaning-modal__close" onClick={onClose}>Got it</button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// RIVER PANEL (right)
// ─────────────────────────────────────────────────────────

function RiverPanel({ netWorth }: { netWorth: number }) {
  const tier  = getTier(netWorth);
  const level = getTierLevel(netWorth);
  const [showModal, setShowModal]   = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const speedStr = formatRiverSpeed(netWorth, tier.riverRings);

  const multiplierMatch  = speedStr.match(/^(\d+x\s·\s)(.+)$/);
  const multiplierPrefix = multiplierMatch ? multiplierMatch[1] : null;
  const speedValue       = multiplierMatch ? multiplierMatch[2] : speedStr;

  return (
    <div className="river-panel">
      <div className="river-panel__header">
        <div className="river-panel__eyebrow">River Strength</div>
        <AnimatePresence mode="wait">
          <motion.div key={speedStr} className="river-panel__mph-row"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}>
            {multiplierPrefix && <span className="river-panel__multiplier">{multiplierPrefix}</span>}
            <span className={`river-panel__mph${netWorth < 0 ? ' river-panel__mph--neg' : ''}`}>
              {speedValue}
            </span>
          </motion.div>
        </AnimatePresence>
        <div className="river-panel__tier-sub">
          <span className="river-panel__tier-label">{tier.label}</span>
          <span className="river-panel__tier-level"> · Level {level}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tier.advice} className="river-panel__advice"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <span className="advice-icon">✦</span>
            <p>{tier.advice}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tier.label} className="river-glow-wrap"
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <FlowingRiverScene ringCount={tier.riverRings} tier={tier} sid="main" />
        </motion.div>
      </AnimatePresence>

      <div className="river-panel__btn-row">
        <button className="btn-meaning" onClick={() => setShowMeaning(true)}>
          What does the river mean?
        </button>
        <button className="btn-optimal" onClick={() => setShowModal(true)}>
          See Optimal River
        </button>
      </div>

      <AnimatePresence>
        {showModal && <OptimalRiverModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showMeaning && <RiverMeaningModal onClose={() => setShowMeaning(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────

export function RiverPage() {
  const { data: nw } = useNetWorth();
  const netWorth = nw?.liquidNetWorth ?? 0;

  return (
    <div className="river-page">
      <div className="river-page__left"><NetWorthPanel /></div>
      <div className="river-page__divider" />
      <div className="river-page__right"><RiverPanel netWorth={netWorth} /></div>
    </div>
  );
}
