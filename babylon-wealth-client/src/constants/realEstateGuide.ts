export type LandlordRating = 'high' | 'medium' | 'low';

export interface StateGuide {
  abbr: string;
  name: string;
  landlordRating: LandlordRating;
  ratingLabel: string;
  pros: string[];
  cons: string[];
  dealWatch: string[];
  warnings: string[];
}

export interface InvestorTip {
  icon: string;
  title: string;
  body: string;
}

// ── 50 State Guides ───────────────────────────────────────────

export const STATE_GUIDES: StateGuide[] = [
  {
    abbr: 'AL', name: 'Alabama', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Some of the lowest property taxes in the US (avg ~0.4% effective rate)',
      'No rent control statewide — set rents freely',
      'Strong rental demand in college towns (Auburn, Tuscaloosa)',
      'Affordable entry prices leave room for cash flow',
    ],
    cons: [
      'Hurricane and storm risk in southern counties near Mobile',
      'Lower household incomes limit rent growth',
      'Rural markets have very thin buyer pools at exit',
      'Property appreciation historically modest',
    ],
    dealWatch: [
      'Verify flood zone status for properties near Mobile Bay and Gulf Coast',
      'Inspect roof age carefully — storm damage is common and insurers scrutinize claims',
      'Section 8 vouchers active in Birmingham and Huntsville — check HUD payment standards',
      'HVAC systems work hard in the heat; get age and service history',
    ],
    warnings: [
      'Some Alabama cities have municipal courts that move slowly on eviction cases — know your county',
      'Rural properties can sit unsold for years — always have an exit plan before buying',
      'Flood insurance can be required and expensive near coastal areas',
    ],
  },
  {
    abbr: 'AK', name: 'Alaska', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'No state income tax on rental income',
      'High wages from oil, government, and military support strong rents',
      'Strong rental demand in Anchorage and Fairbanks year-round',
      'Minimal competition from out-of-state investors',
    ],
    cons: [
      'Extremely high construction and renovation costs — labor and materials are expensive',
      'Heating systems are critical and costly to replace (oil boilers common)',
      'Very illiquid market — exiting can take a long time',
      'Remote properties have high management costs if self-managing',
    ],
    dealWatch: [
      'Always verify heating system type, age, and annual fuel costs — can be $300+/month in winter',
      'Permafrost can cause foundation issues in northern properties',
      'Insurance can be expensive and limited in remote areas',
      'Factor in higher maintenance costs for extreme weather exposure',
    ],
    warnings: [
      'Very illiquid market — budget for a 6-12 month timeline to sell',
      'Extreme cold accelerates property wear: roofs, pipes, insulation all fail faster',
      'Economy tied to oil prices — rents can soften when oil industry contracts',
    ],
  },
  {
    abbr: 'AZ', name: 'Arizona', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No rent control — statewide preemption prohibits local ordinances',
      'Strong landlord statutes with clear eviction timelines (5-day notice)',
      'Explosive growth in Phoenix metro — huge renter population',
      'Low property taxes relative to national average',
    ],
    cons: [
      'Phoenix market saw dramatic price surges 2020-22 — cash flow harder at today\'s prices',
      'Extreme heat means AC runs constantly — higher utility costs for tenants',
      'HOA fees are common in newer communities and can be restrictive',
      'Water scarcity is a real long-term concern for the state',
    ],
    dealWatch: [
      'Always get the age of the AC unit — in Arizona heat, units last 10-15 years vs. 20 nationally',
      'Get a quote for HOA fees before running numbers — some are $300-500/mo',
      'Verify water supply rights for rural properties outside metro areas',
      'Check if the property is in a floodplain (Maricopa has some flash flood zones)',
    ],
    warnings: [
      'Long-term water rights uncertainty could affect property values in coming decades',
      'Phoenix was one of the most overbuilt markets in 2021-22 — some areas have high vacancy',
      'HOA rules can restrict rental activity in certain communities — verify before purchasing',
    ],
  },
  {
    abbr: 'AR', name: 'Arkansas', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Very low property taxes (among lowest in the US)',
      'Extremely affordable entry prices — high gross yields possible',
      'No rent control statewide',
      'Straightforward landlord-tenant statutes favoring landlords',
    ],
    cons: [
      'Low rental rates limit cash flow ceilings',
      'Very limited appreciation in most markets',
      'Rural areas have significant vacancy challenges',
      'Limited economic growth outside Little Rock and Fayetteville',
    ],
    dealWatch: [
      'Foundation issues are common on clay-rich soils — always get a structural inspection',
      'Check for Section 8 voucher demand in Little Rock — can stabilize cash flow',
      'Roof age and condition critical — hail and storm damage frequent',
      'Fayetteville (University of Arkansas) offers more stable rental demand',
    ],
    warnings: [
      'Very low price appreciation means your equity build is largely via paydown — run long-term numbers',
      'Rural Arkansas properties can have extremely thin exit markets',
      'Tornado risk is real — verify insurance costs and claim history',
    ],
  },
  {
    abbr: 'CA', name: 'California', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Strongest long-term appreciation in the US in many markets',
      'High rental rates — especially in Bay Area, LA, and San Diego',
      'Very large renter population provides consistent demand',
      'Strong economy provides stable employment for tenants',
    ],
    cons: [
      'AB 1482 caps rent increases at 5% + CPI for most properties (max 10%)',
      'Evictions can take 3-6 months minimum — 6-12 months in contested cases',
      'Extremely high entry prices compress cap rates to 3-4% in most markets',
      'Wildfire insurance crisis — some insurers no longer writing in CA',
    ],
    dealWatch: [
      'Check if property falls under AB 1482 rent cap (built before 2007, not condos/SFH with small landlords)',
      'Verify local rent control ordinances — LA, San Francisco, Oakland have additional layers',
      'Always get a wildfire insurance quote BEFORE going into escrow in fire-prone areas',
      'High transfer taxes in San Francisco and LA — factor into your acquisition cost',
    ],
    warnings: [
      'Eviction moratoriums have been extended repeatedly — budget for extended non-payment periods',
      'Insurance crisis is real: State Farm and Allstate have stopped writing new policies in CA',
      'Costa-Hawkins exemptions are subject to political challenge — stay current on legislation',
      'Never buy rent-controlled units without a full legal review — you may be permanently capped',
    ],
  },
  {
    abbr: 'CO', name: 'Colorado', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'Strong economy — tech, aerospace, and outdoor industries drive high wages',
      'No statewide rent control (some cities are pushing for it)',
      'Denver metro has large renter population with strong income',
      'Growing markets in Fort Collins, Colorado Springs, and Boulder',
    ],
    cons: [
      'Denver home prices surged significantly — cash flow is tight',
      'Some municipalities (Denver) have adopted just-cause eviction protections',
      'Property taxes rising as the state reassesses values',
      'Hail storms are very common — roof replacement costs significant',
    ],
    dealWatch: [
      'Check for HOA restrictions on rentals in mountain towns — very common and strict',
      'Always get a hail/wind roof inspection — some insurers require replacement pre-sale',
      'Verify local municipality ordinances — Denver, Boulder, and Vail have additional rules',
      'Short-term rental permits in mountain towns (Breckenridge, Vail) very limited',
    ],
    warnings: [
      'Denver market has seen some softening post-2022 — run conservative rent projections',
      'Some Colorado municipalities are actively considering rent control — monitor legislative trends',
      'Hail damage is the #1 insurance claim in Colorado — check deductibles carefully',
    ],
  },
  {
    abbr: 'CT', name: 'Connecticut', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Very high household incomes — quality tenant pool, especially near Fairfield County',
      'NYC proximity drives significant rental demand in Stamford and Fairfield County',
      'Relatively stable long-term property values',
      'Strong rental demand from Yale (New Haven) and UConn markets',
    ],
    cons: [
      'Property taxes among the highest in the nation',
      'Old housing stock (pre-1960s dominant) requires significant ongoing capex',
      'Tenant-friendly courts — summary process can still take 3-4 months',
      'Economic stagnation in Hartford and Bridgeport limits rent growth',
    ],
    dealWatch: [
      'Always verify for underground oil storage tanks — removal can cost $10,000-30,000+',
      'Lead paint compliance is strictly enforced — test all pre-1978 properties',
      'Factor full property tax amount before running numbers — often $8,000-15,000/yr on SFH',
      'Septic systems common outside urban areas — get an inspection',
    ],
    warnings: [
      'Underground oil tanks are a major liability — they can render a property unsellable if leaking',
      'Hartford and Bridgeport have declining populations and thin exit markets',
      'Property taxes can easily consume 30-40% of gross rent on lower-priced properties',
    ],
  },
  {
    abbr: 'DE', name: 'Delaware', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'No sales tax — favorable business environment',
      'Low property taxes relative to neighboring NJ and MD',
      'Growing Wilmington market driven by financial services sector',
      'Proximity to Philadelphia creates spillover rental demand',
    ],
    cons: [
      'Very small state — limited market depth and comparables',
      'Coastal properties are expensive and have flood/hurricane exposure',
      'Limited inventory in most markets',
      'Slower economic growth than neighboring states',
    ],
    dealWatch: [
      'Coastal/beach properties: verify flood zone and get elevation certificate',
      'Septic systems very common in rural Sussex County — inspect thoroughly',
      'Wilmington has some distressed neighborhoods — do block-level research',
      'Short-term rental demand is strong in beach areas but seasonal',
    ],
    warnings: [
      'Very small market makes it hard to find comparable sales — valuations can be imprecise',
      'Beach/coastal properties have high insurance costs and seasonal vacancy risk',
      'Limited economic diversification — Wilmington\'s financial services exposure',
    ],
  },
  {
    abbr: 'FL', name: 'Florida', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No state income tax on rental income',
      'Statewide preemption of rent control — no local ordinances allowed',
      'Massive population growth driving persistent rental demand',
      'Clear landlord-tenant statutes with predictable eviction timelines (3-day notice)',
    ],
    cons: [
      'Hurricane and wind insurance costs have skyrocketed — some areas see $8,000-15,000+/yr',
      'Several major insurance companies have exited the Florida market',
      'Flood insurance mandatory in many zones — adds significant ongoing cost',
      'HOA fees are ubiquitous and can be very high with special assessments',
    ],
    dealWatch: [
      'ALWAYS get a full wind/hurricane insurance quote BEFORE going under contract',
      'Check FEMA flood zone status — flood insurance is separate and can be $2,000-8,000/yr',
      'Review HOA financials for reserve fund adequacy — underfunded HOAs face special assessments',
      'Verify roof age and material — insurance may not cover roofs over 15-20 years old',
    ],
    warnings: [
      'Insurance crisis is severe — Citizens Insurance (state insurer of last resort) is now the largest insurer in FL',
      'Condo special assessments post-Surfside collapse are significant — review condo reserves carefully',
      'Some zip codes are essentially uninsurable for wind coverage at affordable rates',
      'Sea-level rise is a long-term risk to coastal property values',
    ],
  },
  {
    abbr: 'GA', name: 'Georgia', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Atlanta metro is one of the fastest-growing major markets in the US',
      'No rent control statewide',
      'Landlord-friendly statutes and reasonable eviction timelines',
      'Low property taxes outside of Atlanta (Fulton County higher)',
    ],
    cons: [
      'Atlanta metro prices have risen significantly — cash flow harder in prime areas',
      'Crime rates vary dramatically by neighborhood — micro-location research is critical',
      'Suburban sprawl means a 2-mile difference can be a totally different market',
      'Atlanta traffic impacts tenant quality and retention in car-dependent areas',
    ],
    dealWatch: [
      'Always check crime statistics at the street level — use SpotCrime, NeighborhoodScout',
      'Walk score and school district ratings heavily influence tenant quality in Atlanta',
      'Verify flood zones near Chattahoochee River areas in the metro',
      'Section 8 rates vary widely by county — compare to market rents before assuming cash flow',
    ],
    warnings: [
      'Gwinnett, Cobb, and Cherokee counties are investor-friendly; City of Atlanta is more complex',
      'Some Atlanta neighborhoods that appeared to gentrify have stalled — verify current trend',
      'Property management quality varies enormously in Atlanta — vet PMs carefully',
    ],
  },
  {
    abbr: 'HI', name: 'Hawaii', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Highest rents in the nation relative to income',
      'Extremely stable long-term property values — limited land supply',
      'Tourism economy creates secondary STR demand (where permitted)',
      'Very low crime relative to national average',
    ],
    cons: [
      'Extremely high entry prices (median SFH over $1M on Oahu)',
      'Strong tenant protections and slow eviction process',
      'Non-owner-occupied properties face very high property tax rates',
      'Short-term rental permits in Honolulu are severely restricted',
    ],
    dealWatch: [
      'Non-owner-occupied property tax rate is dramatically higher — always verify exact tax bill',
      'STR permits (Oahu): only allowed in resort-zoned areas — verify zoning before buying',
      'Leasehold vs. fee simple land ownership — only buy fee simple unless deeply discounted',
      'Flood and hurricane insurance — required in many areas',
    ],
    warnings: [
      'Leasehold properties have an expiration date — avoid unless you understand the lease terms',
      'STR crackdowns have been severe — do not buy banking on vacation rental income without a valid permit',
      'The property tax differential for investment vs. owner-occupied is massive — verify before underwriting',
    ],
  },
  {
    abbr: 'ID', name: 'Idaho', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No state rent control — landlords set market rents freely',
      'Boise metro has seen significant population growth and economic diversification',
      'No income tax on corporate landlords (pass-through depends on structure)',
      'Strong landlord statutes with clear notice requirements',
    ],
    cons: [
      'Boise prices surged 40-60% during 2020-22 — cash flow at current prices is challenging',
      'Limited inventory in Boise metro',
      'Smaller secondary markets (Twin Falls, Pocatello) have thin exit liquidity',
      'Limited economic diversification outside of Boise',
    ],
    dealWatch: [
      'Run cash flow numbers very carefully — appreciation has outpaced rent growth significantly',
      'Water rights are important for any rural or agricultural adjacent property',
      'Verify HOA rental restrictions in newer developments — common in Boise suburbs',
      'Agricultural tax exemptions can be lost upon purchase — verify tax status',
    ],
    warnings: [
      'Post-pandemic migration wave may slow — don\'t underwrite future appreciation into cash flow',
      'Some areas of Boise remain overvalued relative to local income levels',
      'Very limited market outside Boise — rural Idaho properties can be difficult to exit',
    ],
  },
  {
    abbr: 'IL', name: 'Illinois', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Chicago has a massive, diverse renter population with stable demand',
      'High wage market supports premium rents in desirable neighborhoods',
      'Good infrastructure and transit create strong location differentials',
      'University towns (Champaign-Urbana) offer stable college rental income',
    ],
    cons: [
      'Cook County has among the highest property taxes in the US (2-3%+ of value)',
      'Chicago is strongly tenant-friendly — just-cause eviction protections apply',
      'Illinois pension crisis creates long-term municipal fiscal risk',
      'Property tax assessments can jump dramatically when a property changes hands',
    ],
    dealWatch: [
      'ALWAYS calculate full property tax burden — Cook County SFH can be $8,000-25,000+/yr',
      'Check if property is in a TIF (Tax Increment Financing) district — affects future development',
      'Chicago Landlord Tenant Ordinance has strict requirements — mandatory disclosures, habitability standards',
      'Special assessments for city infrastructure can be substantial — check with city',
    ],
    warnings: [
      'Illinois has a structural pension deficit — risk of higher property taxes over time',
      'Chicago eviction courts can take 4-6 months even for non-payment cases',
      'Some neighborhoods on Chicago\'s west and south side have very high crime — do deep location research',
      'Never underestimate the property tax drag — it is the #1 cash flow killer in Illinois',
    ],
  },
  {
    abbr: 'IN', name: 'Indiana', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Very landlord-friendly statutes — among the best in the Midwest',
      'Low property taxes (under 1% effective rate in most areas)',
      'Indianapolis is growing and attracting corporate relocations',
      'Affordable entry prices allow for positive cash flow from day 1',
    ],
    cons: [
      'Modest rent growth in most Indiana markets',
      'Some Rust Belt cities (Gary, Hammond) have significant blight and vacancy',
      'Limited appreciation in smaller markets',
      'Cold winters increase maintenance costs',
    ],
    dealWatch: [
      'Indianapolis Section 8 program is active — verify HUD fair market rent rates',
      'Gary and Hammond: extremely cheap properties exist but risk is very high — only buy if you know the submarket',
      'Foundation issues can occur with older homes — get a thorough structural inspection',
      'HVAC age is critical for cold winters — budget for replacement if over 15 years',
    ],
    warnings: [
      'Gary, Indiana has some of the most distressed real estate in the US — know exactly what you\'re buying',
      'Rust Belt exposure in northern Indiana — economic stagnation limits upside',
      'Always verify title clearly in Indiana — some distressed markets have complex title histories',
    ],
  },
  {
    abbr: 'IA', name: 'Iowa', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Extremely stable economy driven by agriculture, insurance, and healthcare',
      'No rent control statewide',
      'Low unemployment keeps vacancy low',
      'Affordable entry prices with reasonable gross yields',
    ],
    cons: [
      'Very limited price appreciation historically',
      'Agricultural economy exposure can create localized economic swings',
      'Cold winters drive higher maintenance and heating costs',
      'Limited market liquidity outside Des Moines and Iowa City',
    ],
    dealWatch: [
      'Check tornado and hail damage history — Iowa is in tornado alley',
      'Roof and HVAC age critical — both work hard in extreme Iowa weather',
      'Iowa City (University of Iowa) and Ames (Iowa State) offer more stable student rental demand',
      'Des Moines has the strongest appreciation trend in the state',
    ],
    warnings: [
      'Very limited price appreciation — your return is primarily cash flow and debt paydown',
      'Rural Iowa properties can be extremely illiquid — exits may take 12+ months',
      'Flooding risk along the Iowa and Cedar Rivers — verify flood zones carefully',
    ],
  },
  {
    abbr: 'KS', name: 'Kansas', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No rent control statewide',
      'Very affordable market — high gross rent-to-price ratios possible',
      'Low unemployment in Kansas City metro (Kansas side)',
      'Stable government and defense employment (Wichita aerospace)',
    ],
    cons: [
      'Tornado risk is among the highest in the US',
      'Very limited appreciation in most markets',
      'Economy concentrated in agriculture and defense — limited diversification',
      'Wichita market is flat to declining in some areas',
    ],
    dealWatch: [
      'Always review insurance costs — hail and tornado risk drives premiums',
      'Hail damage roof replacement is very common — check claim history',
      'Kansas City (KS side) benefits from proximity to Missouri metro',
      'Verify wind mitigation features — can reduce insurance premiums',
    ],
    warnings: [
      'Tornado damage can be catastrophic — verify comprehensive insurance coverage',
      'Very limited appreciation means you\'re primarily a yield investor, not growth',
      'Some Kansas towns are declining in population — avoid markets with falling demand',
    ],
  },
  {
    abbr: 'KY', name: 'Kentucky', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Low property taxes — one of the most landlord-friendly cost structures',
      'Louisville is growing and attracting Amazon/UPS logistics investment',
      'No rent control statewide',
      'Affordable entry prices relative to national average',
    ],
    cons: [
      'Low rental rates limit cash flow ceiling',
      'Eastern Kentucky coal country economy is declining',
      'Limited appreciation outside Louisville',
      'Some urban neighborhoods in Louisville have high crime',
    ],
    dealWatch: [
      'Radon is common in Kentucky — always test during due diligence',
      'Hillside properties can have foundation issues — get structural inspection',
      'Louisville\'s east end vs. west end — massive difference in tenant quality and appreciation',
      'Verify flood zones along the Ohio River and its tributaries',
    ],
    warnings: [
      'Eastern Kentucky is economically depressed — only invest if you have local knowledge and very low basis',
      'Some Louisville zip codes have high crime concentrations — do block-level research',
      'Radon is a material issue in Kentucky — remediation adds cost if discovered post-purchase',
    ],
  },
  {
    abbr: 'LA', name: 'Louisiana', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'New Orleans has strong short-term and long-term rental demand from tourism',
      'Low entry prices in many markets outside New Orleans',
      'No statewide rent control',
      'Cultural economy provides consistent hospitality industry employment',
    ],
    cons: [
      'Hurricane risk is severe — Katrina (2005) and Ida (2021) devastated large areas',
      'Flood insurance is mandatory in many areas and can be $3,000-8,000+/yr',
      'Some courts are slow on eviction cases',
      'Insurance market is very stressed — limited carriers writing new policies',
    ],
    dealWatch: [
      'Get an elevation certificate before making any offer — it determines flood insurance cost',
      'New Orleans STR permits are limited by zone — verify before buying for STR',
      'Check the property\'s insurance claim history — multiple claims can make it uninsurable',
      'Post-Ida damage inspection: check for hidden water intrusion and mold',
    ],
    warnings: [
      'Flood insurance is non-negotiable in most Louisiana markets — get the full cost upfront',
      'Some New Orleans neighborhoods have not fully recovered from Katrina — verify current conditions',
      'High crime in parts of New Orleans and Baton Rouge — always do neighborhood-level research',
      'Climate risk is long-term: rising sea levels and intensifying hurricanes pose existential risk',
    ],
  },
  {
    abbr: 'ME', name: 'Maine', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'Strong STR demand in coastal areas (Kennebunkport, Bar Harbor, Ogunquit)',
      'Portland is one of the fastest-growing small cities in New England',
      'Low property taxes relative to neighboring states',
      'Stable long-term values in desirable coastal markets',
    ],
    cons: [
      'Highly seasonal demand in coastal and resort areas',
      'Cold climate drives high heating costs — oil heat is common',
      'Portland has growing tenant protections and a tight rental market',
      'Very limited economic base outside Portland and the tourism industry',
    ],
    dealWatch: [
      'Heating system type is critical — oil heat costs have been volatile ($3,000-6,000/yr)',
      'Shoreline properties need flood insurance — verify elevation and FEMA zone',
      'Portland rental market: verify if property falls under any local tenant protection ordinances',
      'STR properties: check for local permit requirements — some towns restricting',
    ],
    warnings: [
      'Seasonal coastal rentals can have 4-6 months of vacancy — underwrite conservatively',
      'Portland is increasingly expensive with compressed cap rates — run tight numbers',
      'Oil heat price volatility is a real risk for maintaining tenant affordability',
    ],
  },
  {
    abbr: 'MD', name: 'Maryland', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'DC metro proximity drives extremely strong demand in Montgomery and Prince George\'s counties',
      'High household incomes — quality tenant pool with stable government employment',
      'Very stable long-term property values near DC',
      'Large military presence provides consistent renter demand (Fort Meade, Andrews)',
    ],
    cons: [
      'High property taxes across most of the state',
      'Baltimore City is strongly tenant-friendly with slow eviction courts',
      'Montgomery County has rent control (limited, but it exists)',
      'Lead paint compliance is strictly and expensively enforced in older housing',
    ],
    dealWatch: [
      'Always test for lead paint in pre-1978 properties — Maryland enforcement is very strict',
      'Baltimore City: verify neighborhood trend carefully — some areas improving, others declining',
      'Factor the full property tax bill into your underwriting — can be $5,000-12,000+/yr',
      'Check ground rent (still exists in some Baltimore properties — buy it out)',
    ],
    warnings: [
      'Ground rent is a unique Maryland legal concept — some properties have annual ground rent obligations',
      'Baltimore City eviction courts are among the slowest in the region',
      'Lead paint abatement in older Baltimore stock can cost $10,000-30,000 per unit',
      'Some Baltimore neighborhoods have very high crime — do deep block-level analysis',
    ],
  },
  {
    abbr: 'MA', name: 'Massachusetts', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Highest rents in New England — Boston, Cambridge, and Brookline command premium rates',
      'Massive educated tenant pool from 100+ colleges and universities',
      'Extremely stable long-term property values',
      'Strong economy with biotech, finance, and education sectors',
    ],
    cons: [
      'Very tenant-friendly laws — eviction process takes 4-6 months minimum',
      'Just-cause eviction protections being adopted in more cities',
      'Extremely high entry prices compress returns',
      'Lead paint compliance is mandatory and expensive for units with children',
    ],
    dealWatch: [
      'Multi-family buildings over 3 units require sprinkler systems — cost can be substantial if not installed',
      'Lead paint deleading is legally required if you have tenants with children under 6 — budget $10,000-30,000',
      'Boston/Cambridge: check if property is in a condo-conversion restricted zone',
      'Verify heating fuel type — oil heat costs are high and volatile',
    ],
    warnings: [
      'Boston and Cambridge are actively considering rent control legislation — monitor closely',
      'Eviction moratoriums were extended multiple times during COVID — budget for extended exposure',
      'Lead paint deleading is not optional — if a child lives in the unit, you can be ordered to delead immediately',
      'Security deposit laws are very strict — violations result in treble damages',
    ],
  },
  {
    abbr: 'MI', name: 'Michigan', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'Detroit suburbs (Oakland County, Macomb County) are very affordable with solid cash flow',
      'No rent control statewide',
      'Grand Rapids is one of the fastest-growing mid-size cities in the Midwest',
      'Ann Arbor has very stable rental demand from University of Michigan',
    ],
    cons: [
      'Detroit City proper remains high-risk with blight, vacancy, and complex title issues',
      'Cold winters mean high heating and maintenance costs',
      'Aging housing stock requires significant ongoing capex',
      'Certain Michigan markets have declining populations',
    ],
    dealWatch: [
      'Detroit City: thoroughly research every parcel — blight, demolition orders, and complex title are common',
      'Furnace/boiler age is critical in Michigan winters — budget for replacement if over 15 years',
      'Grand Rapids is growing fast — south-side neighborhoods offer good value',
      'Lead paint is common in pre-1978 stock in Flint and Detroit — always test',
    ],
    warnings: [
      'Flint, Michigan has severe environmental (lead water) and economic issues — avoid entirely',
      'Detroit City Land Bank properties have complex acquisition processes — not for beginners',
      'Some Michigan zip codes have experienced 50%+ value declines — know your submarket',
    ],
  },
  {
    abbr: 'MN', name: 'Minnesota', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Strong, diversified economy — healthcare, finance, retail, and tech',
      'High household incomes — quality tenant pool',
      'Twin Cities stable long-term market with consistent demand',
      'Rochester (Mayo Clinic) provides very stable, high-income tenant pool',
    ],
    cons: [
      'Minneapolis enacted rent stabilization (3% annual cap) in 2022',
      'Very tenant-friendly statewide statutes',
      'Cold climate drives very high heating and maintenance costs',
      'High entry prices in the Twin Cities',
    ],
    dealWatch: [
      'Minneapolis rent control applies to most residential rental properties — verify current cap and exemptions',
      'Minneapolis exempts new construction (built after 2021) from rent control — newer builds preferable',
      'Boiler/furnace age and efficiency — heating costs in Minnesota winters can be $200-400+/month',
      'St. Paul also has rent control (limited) — check current status',
    ],
    warnings: [
      'Minneapolis rent stabilization permanently caps rent growth at 3% — your upside is structurally limited',
      'Minnesota winters are extreme — budget high for heating, snow removal, and weather-related maintenance',
      'Post-2020 unrest left some Minneapolis neighborhoods with higher vacancy — research current conditions',
    ],
  },
  {
    abbr: 'MS', name: 'Mississippi', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Lowest cost of living in the US — highest relative gross yields',
      'Very landlord-friendly landlord-tenant statutes',
      'Low property taxes',
      'High Section 8 participation rates stabilize cash flow',
    ],
    cons: [
      'Very low household incomes — tenant base is often Section 8 dependent',
      'Very limited property appreciation',
      'High poverty rates create higher maintenance and turnover costs',
      'Very thin exit market — difficult to sell investment properties',
    ],
    dealWatch: [
      'Section 8 vouchers dominate in many Mississippi markets — understand HUD payment standards for your area',
      'Always budget high for turnover costs — tenant mobility is high',
      'Deferred maintenance is common in affordable price points — get thorough inspections',
      'Flood risk near the Mississippi River and coastal areas',
    ],
    warnings: [
      'Mississippi has one of the highest eviction rates — courts are landlord-friendly, but turnover costs add up',
      'Very illiquid exit market — plan for a long hold or difficulty selling',
      'Hurricane risk in coastal counties near Gulf Coast — verify insurance carefully',
    ],
  },
  {
    abbr: 'MO', name: 'Missouri', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No rent control statewide',
      'Kansas City is a growing metro with diverse economy',
      'Affordable entry prices — strong cash flow potential in KC and Columbia',
      'Landlord-friendly statutes with reasonable eviction process',
    ],
    cons: [
      'St. Louis City has among the highest violent crime rates in the US',
      'Some St. Louis neighborhoods are in long-term decline',
      'City vs. county distinction in St. Louis is critical — City is not part of St. Louis County',
      'Limited appreciation in most Missouri markets',
    ],
    dealWatch: [
      'St. Louis City vs. County: always specify — City of St. Louis has dramatically higher crime and lower values',
      'Kansas City: midtown and plaza areas appreciate; some eastern neighborhoods are distressed',
      'Check crime statistics at the block level in St. Louis — it varies dramatically',
      'Columbia, MO (University of Missouri) offers stable student rental demand',
    ],
    warnings: [
      'St. Louis City is consistently ranked as one of the most dangerous cities in the US — be extremely location-specific',
      'Property values in some St. Louis City zip codes have declined significantly',
      'Avoid buying in transitional areas without deep knowledge of the hyperlocal trends',
    ],
  },
  {
    abbr: 'MT', name: 'Montana', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No rent control statewide',
      'Bozeman and Missoula are attracting remote workers and outdoor enthusiasts',
      'Strong lifestyle demand drives consistent rental demand in growth markets',
      'Low crime relative to national average',
    ],
    cons: [
      'Bozeman prices have surged dramatically — cash flow is extremely difficult at current prices',
      'Very seasonal demand in resort and ski markets',
      'Limited economic base outside of Bozeman and Missoula',
      'Extreme cold increases operating costs significantly',
    ],
    dealWatch: [
      'Septic systems are very common outside Bozeman — get a full inspection',
      'Well water systems: test water quality and verify well depth and pump age',
      'Heating system type — propane and heating oil common; annual costs can be $3,000-6,000',
      'Short-term rental regulations in Whitefish and Big Sky are getting stricter',
    ],
    warnings: [
      'Bozeman prices are at or beyond San Francisco price-to-rent ratios — cash flow is nearly impossible',
      'Remote location means self-managing from out of state is very difficult',
      'Very illiquid market — the pool of buyers is thin and transactions are slow',
    ],
  },
  {
    abbr: 'NE', name: 'Nebraska', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Omaha is a stable, diversified market (Warren Buffett\'s home base — finance and insurance)',
      'Very low unemployment historically',
      'No rent control statewide',
      'Affordable entry prices with decent yields',
    ],
    cons: [
      'Very limited appreciation in most Nebraska markets',
      'Agricultural economy exposure',
      'Limited market liquidity outside of Omaha',
      'Tornado and severe weather risk',
    ],
    dealWatch: [
      'Tornado and hail damage history — check insurance claim history',
      'Sump pump systems are important — flooding from heavy rain events is common',
      'Omaha\'s midtown offers better appreciation than outlying rural markets',
      'Verify HVAC and roof age — both work hard in Nebraska\'s weather extremes',
    ],
    warnings: [
      'Very slow appreciation means your primary return is yield — run cash-on-cash projections, not appreciation',
      'Rural Nebraska markets are extremely illiquid',
      'Agricultural land adjacent properties can have drainage issues',
    ],
  },
  {
    abbr: 'NV', name: 'Nevada', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No state income tax on rental income',
      'Statewide preemption of rent control — Las Vegas and Reno cannot enact it',
      'Very landlord-friendly statutes — among the fastest eviction processes in the US',
      'Strong rental demand in Las Vegas from service industry workers',
    ],
    cons: [
      'Las Vegas economy is heavily concentrated in tourism and gaming — recession risk is high',
      'AC units work extremely hard in desert heat — shorter lifespan (8-12 years)',
      'HOAs are very common and can be expensive with strict rules',
      'Water supply long-term risk (Lake Mead levels)',
    ],
    dealWatch: [
      'ALWAYS check HOA rules — some prohibit or severely restrict rental activity',
      'AC unit age is critical — replacement in Las Vegas heat costs $5,000-10,000',
      'Verify HOA fees — can be $200-500/month in some communities',
      'Las Vegas new home builder warranties expire quickly — buy-and-hold in established areas',
    ],
    warnings: [
      'Las Vegas dropped 50%+ in values during 2008-2012 — economic concentration risk is real',
      'Some HOAs in Las Vegas/Henderson have been fined or sued — review HOA financials before buying',
      'Long-term water supply risk (Colorado River allocation disputes)',
    ],
  },
  {
    abbr: 'NH', name: 'New Hampshire', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'No income tax and no sales tax',
      'Southern NH (Manchester, Nashua) benefits massively from Boston spillover demand',
      'Low crime relative to national average',
      'Growing tech presence in the Southern Tier',
    ],
    cons: [
      'Property taxes are among the highest in New England',
      'Cold climate with high heating costs (oil heat very common)',
      'Limited housing inventory driving prices up',
      'Seasonal demand in mountain areas (White Mountains)',
    ],
    dealWatch: [
      'Oil heating systems — verify age of tank and boiler; annual oil costs $3,000-5,000',
      'Septic systems common in rural areas — always inspect',
      'Property taxes: verify exact amount — some NH towns have 2%+ effective rates',
      'Southern NH properties: check commuter access to Boston (Route 3, I-93)',
    ],
    warnings: [
      'High property taxes eat into cash flow significantly — always get the exact tax bill',
      'Oil heat price volatility creates unpredictable operating cost fluctuations',
      'Manchester has some neighborhoods with crime concentration — do block-level research',
    ],
  },
  {
    abbr: 'NJ', name: 'New Jersey', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Very high household incomes — premium rents achievable in commuter towns',
      'NYC and Philadelphia metro proximity drives massive, persistent rental demand',
      'Stable long-term property values in desirable commuter towns',
      'Large, diverse renter population',
    ],
    cons: [
      'Highest property taxes in the US — SFH commonly $8,000-20,000+/yr',
      'Very tenant-friendly laws with slow eviction courts',
      'High entry prices throughout most of the state',
      'Significant local variation in tenant protections',
    ],
    dealWatch: [
      'ALWAYS get the exact property tax bill — it is the single most important underwriting input in NJ',
      'Verify municipality\'s rent control status — many NJ towns have local ordinances',
      'Newark, Trenton, Camden: check crime statistics very carefully',
      'Transfer taxes and attorney fees are mandatory in NJ — add 2-3% to acquisition costs',
    ],
    warnings: [
      'Property taxes in NJ can make a deal that pencils elsewhere completely unworkable',
      'Some NJ cities have rent control that the state tenant law stacks on top of',
      'Evictions in NJ courts can take 6-12 months — budget for extended non-payment periods',
      'Environmental contamination is a concern near industrial areas (former Garden State manufacturing)',
    ],
  },
  {
    abbr: 'NM', name: 'New Mexico', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'Affordable entry prices in Albuquerque',
      'Growing Santa Fe market with tourism and arts economy',
      'Sunbelt climate — lower heating costs',
      'No statewide rent control',
    ],
    cons: [
      'Albuquerque has persistent high crime — significantly limits tenant pool quality',
      'Slow economic growth limits rent appreciation',
      'Limited economic diversification outside Albuquerque',
      'Tenant-friendly trends in Albuquerque city council',
    ],
    dealWatch: [
      'Crime statistics are critical in Albuquerque — research every neighborhood before buying',
      'Verify water rights for rural properties in the desert',
      'Santa Fe has very strict historic preservation rules — check renovation restrictions',
      'HOA rules in Santa Fe can be very strict regarding exterior aesthetics',
    ],
    warnings: [
      'Albuquerque\'s crime rate is significantly above national average — very location-specific investing',
      'Some Albuquerque neighborhoods have chronic vacancy due to crime',
      'Limited economic drivers means rent growth can stagnate for long periods',
    ],
  },
  {
    abbr: 'NY', name: 'New York', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Highest market rents in the US in NYC',
      'Massive renter population — over 65% of NYC residents are renters',
      'Very stable long-term values in desirable NYC neighborhoods',
      'Strong economy provides consistent rental demand',
    ],
    cons: [
      'Housing Stability and Tenant Protection Act (2019) dramatically strengthened tenant rights',
      'Rent stabilization permanently caps increases on 1M+ NYC units',
      'Evictions can take 6-18 months — contested cases even longer',
      'Very high acquisition and transaction costs',
    ],
    dealWatch: [
      'NEVER buy a rent-stabilized unit without understanding current legal rent vs. market rent',
      'Check if building is subject to 421-a tax abatement (expiration means sudden large tax increase)',
      'NYC transfer tax (1-2.625%) and mansion tax (1%+ over $1M) add significant acquisition cost',
      'Upstate NY markets (Buffalo, Rochester, Albany) are entirely different — landlord-friendlier',
    ],
    warnings: [
      'Rent-stabilized units are essentially permanent rent caps — the spread between legal rent and market rent is real income you\'ll never recover',
      'HSTPA eliminated vacancy decontrol — stabilized units stay stabilized forever',
      'NYC eviction process is among the slowest and most expensive in the US',
      'Lead paint compliance, heat obligations, and habitability standards are very strictly enforced in NYC',
    ],
  },
  {
    abbr: 'NC', name: 'North Carolina', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Charlotte and Raleigh-Durham are among the fastest-growing metros in the Southeast',
      'No rent control statewide',
      'Clear, landlord-friendly landlord-tenant statutes',
      'Strong, diverse economy — banking (Charlotte), tech/research (Research Triangle)',
    ],
    cons: [
      'Charlotte and Raleigh prices have risen significantly — cash flow harder in prime areas',
      'Suburban sprawl means location (and school district) matters enormously',
      'Hurricane risk in eastern NC',
      'Some municipalities considering additional tenant protections',
    ],
    dealWatch: [
      'School district quality is a primary driver of tenant quality and appreciation in NC suburbs',
      'Charlotte: verify neighborhood trend — some areas gentrifying, others not',
      'Eastern NC: verify flood/hurricane exposure near the coast',
      'New construction quality varies — get an inspection even on newer homes',
    ],
    warnings: [
      'Charlotte and Raleigh are seeing strong demand, but prices have risen faster than rents in some areas — verify actual cash flow',
      'Some NC cities (Asheville) are considering rent stabilization — monitor',
      'HOA rules in newer communities can be very restrictive for investors',
    ],
  },
  {
    abbr: 'ND', name: 'North Dakota', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No rent control statewide',
      'Very low crime',
      'Stable government employment base in Bismarck/Fargo',
      'Fargo has growing healthcare and university-driven economy',
    ],
    cons: [
      'Williston and western ND economy directly tied to oil prices — boom/bust cycles',
      'Extreme cold weather drives very high operating costs',
      'Very limited market liquidity — small population',
      'Oil bust dramatically reduced rents in western ND',
    ],
    dealWatch: [
      'Williston rents track oil prices directly — check current Bakken activity before buying',
      'Heating system efficiency is critical — brutal winters mean very high energy costs',
      'Fargo market is more stable than western ND — better for long-term buy and hold',
      'Very few property management companies available — self-management often required',
    ],
    warnings: [
      'Williston saw rents drop 50%+ when oil prices collapsed in 2015-16 — understand this risk',
      'Extreme illiquidity — Bismarck/Fargo are modest markets; Williston is very small',
      'Infrastructure can be strained in oil boom towns — verify utilities',
    ],
  },
  {
    abbr: 'OH', name: 'Ohio', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Columbus is one of the fastest-growing major metros in the Midwest',
      'Very affordable — among the best cash flow markets in the US (Cleveland, Cincinnati)',
      'No rent control statewide',
      'Landlord-friendly statutes with reasonable eviction timelines',
    ],
    cons: [
      'Cleveland and Youngstown have Rust Belt exposure with significant blight',
      'Cold winters increase maintenance costs',
      'Lead paint is very common in older stock — strictly enforced in Cleveland',
      'Property values vary enormously within each metro area',
    ],
    dealWatch: [
      'Cleveland: lead paint compliance is enforced at the city level — always test pre-1978 properties',
      'Youngstown and East Cleveland: extremely distressed — very high risk, very illiquid',
      'Columbus (especially short north, Italian village, Franklinton): strong appreciation trend',
      'Cincinnati: Over-the-Rhine has gentrified significantly — verify current pricing',
    ],
    warnings: [
      'Youngstown has among the highest blight rates in the US — extreme caution required',
      'Lead paint liability in Cleveland can be very significant — understand the compliance requirements',
      'East Cleveland is a separate municipality from Cleveland — extremely distressed',
    ],
  },
  {
    abbr: 'OK', name: 'Oklahoma', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Very landlord-friendly statutes — among the best in the South',
      'Affordable Oklahoma City market',
      'Low property taxes',
      'No rent control statewide',
    ],
    cons: [
      'Economy significantly tied to oil and gas — correlated with energy price cycles',
      'Tornado and severe weather risk among the highest in the US',
      'Limited appreciation outside of OKC',
      'Insurance costs are elevated due to storm risk',
    ],
    dealWatch: [
      'Hail and storm damage history is critical — check claim history with insurer',
      'Roof age and material type — many insurers require specific roofing for favorable rates',
      'Oklahoma City north side vs. south side — significant difference in appreciation and tenant quality',
      'Wind mitigation upgrades can reduce insurance premiums',
    ],
    warnings: [
      'Oklahoma is in Tornado Alley — ensure comprehensive coverage including tornado damage',
      'Energy sector downturns can soften OKC employment and rents',
      'Hail is so common that some roofs are replaced on 7-10 year cycles — factor into capex',
    ],
  },
  {
    abbr: 'OR', name: 'Oregon', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Portland has high rental rates and a large renter population',
      'Bend is a growing outdoor recreation hub with strong demand',
      'Strong long-term property values in metro Portland',
      'No sales tax',
    ],
    cons: [
      'Oregon was the FIRST state to enact statewide rent control (2019) — 7% + CPI cap',
      'Very tenant-friendly — just-cause eviction protections are statewide',
      'Portland homelessness and public safety issues have affected some neighborhoods',
      'Eviction process is slow and expensive',
    ],
    dealWatch: [
      'Verify the current rent control cap — it is calculated annually (7% + CPI)',
      'Check current lease terms — tenants with long tenancy have strong just-cause protections',
      'Portland: verify neighborhood conditions — some areas have seen increased vacancy',
      'Wildfire risk is growing in eastern Oregon and parts of western Oregon',
    ],
    warnings: [
      'Oregon\'s rent control is permanent and caps your upside — model rent growth at 5-7% maximum',
      'Portland had significant landlord exodus 2020-22 — understand current market conditions before buying',
      'Just-cause eviction means you cannot non-renew a lease without a qualifying reason — understand your exposure',
      'Wildfire smoke has health and habitability implications in affected areas',
    ],
  },
  {
    abbr: 'PA', name: 'Pennsylvania', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'Philadelphia has strong rental demand from massive university presence',
      'Pittsburgh is growing with tech and healthcare investment',
      'Affordable entry prices relative to comparable East Coast cities',
      'Allentown and Reading markets offer high yields',
    ],
    cons: [
      'Philadelphia is tenant-friendly with strict city-specific ordinances',
      'Pennsylvania transfer tax is 2% (1% state + 1% local) plus city transfer tax in Philadelphia',
      'Pittsburgh winters increase maintenance costs',
      'Philadelphia requires Rental Licenses and L&I (Licenses and Inspections) compliance',
    ],
    dealWatch: [
      'Philadelphia Rental License is mandatory — budget for licensing process before buying',
      'Lead paint compliance is strictly enforced in Philadelphia — test all pre-1978 units',
      'Philadelphia transfer tax total can be 4-5% — factor into acquisition cost',
      'Pittsburgh: Lawrenceville, South Side, and North Side have strong appreciation',
    ],
    warnings: [
      'Philadelphia\'s L&I inspection process can uncover required repairs that affect your acquisition cost',
      'Some Philadelphia zip codes have very high crime — do granular neighborhood research',
      'Allentown and Reading: high yields but also higher tenant turnover and vacancy',
    ],
  },
  {
    abbr: 'RI', name: 'Rhode Island', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'Providence is growing with Brown University and RISD spillover demand',
      'Proximity to Boston drives rental demand in northern RI',
      'No statewide rent control',
      'Coastal Newport has strong vacation rental demand',
    ],
    cons: [
      'Very small market with limited inventory',
      'Old housing stock (pre-1940 dominant) requires significant ongoing capex',
      'Courts can be slow on evictions',
      'Limited economic base outside of Providence',
    ],
    dealWatch: [
      'Lead paint is nearly universal in Rhode Island\'s old housing stock — always test',
      'Oil heating is very common — verify tank age (above-ground vs. underground)',
      'Providence: College Hill and East Side are stable; other areas have higher risk',
      'Newport STR: verify permit requirements — they are getting stricter',
    ],
    warnings: [
      'Rhode Island has some of the oldest housing stock in the US — capex budget must be high',
      'Providence courts have been slow on eviction matters historically',
      'Very illiquid market — limited buyer pool for investment properties',
    ],
  },
  {
    abbr: 'SC', name: 'South Carolina', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No state income tax advantage (flat 6.5% but lower than many states)',
      'Charleston and Columbia are fast-growing markets',
      'No rent control statewide',
      'Very landlord-friendly statutes and eviction process',
    ],
    cons: [
      'Hurricane and tropical storm risk on the coast',
      'Coastal flood insurance can be very expensive',
      'HOA rules are common in new coastal and planned communities',
      'Charleston entry prices have risen significantly',
    ],
    dealWatch: [
      'Coastal properties: get full wind/hurricane insurance quote and flood zone status before making an offer',
      'HOA rules: some coastal communities restrict rental activity or require minimum rental periods',
      'Charleston peninsula has flood risk — verify elevation certificate',
      'Myrtle Beach STR market: verify local rental restrictions',
    ],
    warnings: [
      'Coastal insurance is tightening — some insurers limiting or exiting coastal SC coverage',
      'Charleston flooding is increasing with sea-level rise — long-term coastal value risk',
      'HOA special assessments for coastal infrastructure can be significant',
    ],
  },
  {
    abbr: 'SD', name: 'South Dakota', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No state income tax',
      'No rent control',
      'Very landlord-friendly legal environment',
      'Low crime',
    ],
    cons: [
      'Very limited market — Sioux Falls is only major metro (200k+ area)',
      'Extreme cold weather drives high heating costs',
      'Very thin exit market for investment properties',
      'Limited economic diversification',
    ],
    dealWatch: [
      'Heating system age and type — propane/oil common outside Sioux Falls',
      'Very limited comparables for valuation — be careful with pricing',
      'Sioux Falls healthcare sector provides stable employment and rental demand',
      'Winter maintenance costs (snow, ice) must be budgeted carefully',
    ],
    warnings: [
      'Extremely illiquid market — plan for a multi-year hold',
      'Limited tenant pool outside of Sioux Falls',
      'Extreme weather can cause significant property damage — ensure full coverage',
    ],
  },
  {
    abbr: 'TN', name: 'Tennessee', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No state income tax on wages or rental income',
      'Nashville is one of the hottest markets in the Southeast',
      'No rent control statewide',
      'Very landlord-friendly laws and eviction process',
    ],
    cons: [
      'Nashville prices have risen dramatically — cash flow is very tight at today\'s prices',
      'Memphis has significant crime issues in many neighborhoods',
      'Property taxes have been rising as values increase',
      'Nashville short-term rental restrictions are getting stricter',
    ],
    dealWatch: [
      'Nashville: verify actual cash flow carefully — appreciation has outpaced rent growth in many zip codes',
      'Memphis: always check crime at block level — NeighborhoodScout and SpotCrime are essential',
      'Nashville STR: owner-occupancy requirement applies for many permit types — verify eligibility',
      'Memphis Section 8: understand HUD Fair Market Rent levels vs. market rents before underwriting',
    ],
    warnings: [
      'Nashville is now priced such that cash flow is nearly impossible without significant down payment',
      'Memphis has one of the highest violent crime rates in the US — very location-specific investing required',
      'Nashville STR permitting has tightened significantly — do not assume a property qualifies without verification',
    ],
  },
  {
    abbr: 'TX', name: 'Texas', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No state income tax on rental income',
      'Statewide preemption of rent control — no city can implement it',
      'Extremely landlord-friendly laws — 3-day notice for non-payment, fast eviction process',
      'Massive population growth across DFW, Austin, Houston, and San Antonio',
    ],
    cons: [
      'Property taxes are very high — effective rate of 2-3% of value per year (this offsets the no income tax)',
      'Austin market is significantly overpriced for cash flow',
      'Hail damage is a major insurance claim driver in DFW',
      'Foundation issues on expansive clay soils are extremely common in DFW',
    ],
    dealWatch: [
      'ALWAYS calculate the full property tax amount before running numbers — it is often the #1 expense',
      'DFW foundations: get a licensed structural engineer report — pier and beam foundation repairs cost $5,000-30,000',
      'Verify HOA rules do not restrict rental use in suburban communities',
      'Get a hail/storm damage roof inspection — DFW roofs are often replaced every 10-15 years due to hail',
    ],
    warnings: [
      'Texas property taxes look manageable until you realize $350k home = $7,000-10,000/yr in property taxes',
      'Foundation repair is Texas\'s most common and expensive property issue — never skip the structural inspection',
      'Austin is now priced similarly to West Coast markets — cap rates below 3% in many areas',
      'HOA fees in DFW suburbs can be $150-400/month and have strict rules about tenants',
    ],
  },
  {
    abbr: 'UT', name: 'Utah', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No rent control statewide',
      'Salt Lake City metro is a strong tech hub with growing economy',
      'Landlord-friendly eviction process',
      'Strong population growth driving persistent rental demand',
    ],
    cons: [
      'SLC home prices have surged 50%+ — cash flow is extremely difficult at today\'s prices',
      'Very limited housing inventory',
      'Some HOAs in newer communities prohibit or restrict rentals',
      'Air quality (inversion events) is a quality-of-life issue',
    ],
    dealWatch: [
      'HOA docs: verify rental allowance BEFORE making an offer — many SLC-area communities restrict rentals',
      'Ogden and Provo markets may offer better cash flow than SLC proper',
      'Verify property is not in a flood zone (Great Salt Lake vicinity)',
      'Utah County (Provo/Orem): large student renter population from BYU',
    ],
    warnings: [
      'SLC area prices are now at levels where institutional investors dominate — very hard to cash flow',
      'Some UT communities have HOAs that prohibit rentals entirely — this is a major legal restriction',
      'Great Salt Lake water level concerns may affect long-term desirability of certain areas',
    ],
  },
  {
    abbr: 'VT', name: 'Vermont', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'Strong STR demand in ski resort areas (Stowe, Killington, Sugarbush)',
      'Stable long-term values in desirable Vermont towns',
      'Beautiful natural environment drives tourism demand',
      'Low crime',
    ],
    cons: [
      'Very tenant-friendly laws and court processes',
      'Smallest state market — very limited buyer pool at exit',
      'Cold climate with very high heating costs',
      'Very limited economy outside Chittenden County (Burlington)',
    ],
    dealWatch: [
      'STR permits: some towns require permits — verify local ordinances before buying as vacation rental',
      'Lead paint compliance — Vermont strictly enforces in older properties',
      'Heating system type and cost — oil heat common, annual cost can be $4,000-7,000',
      'Burlington has growing tenant protections — verify local ordinances',
    ],
    warnings: [
      'Vermont has an extremely illiquid real estate market — very few buyers for investment properties',
      'Tenant-friendly court system means disputes take longer to resolve',
      'Ski resort STR income is highly seasonal — model conservative annual occupancy',
    ],
  },
  {
    abbr: 'VA', name: 'Virginia', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'Northern Virginia (NoVA) has one of the strongest, most stable economies in the US (government/tech)',
      'Very high household incomes in NoVA — premium rents achievable',
      'No statewide rent control',
      'Richmond and Virginia Beach are growing markets',
    ],
    cons: [
      'Northern Virginia entry prices are very high — compressed returns',
      'Some Virginia localities have adopted or are considering additional tenant protections',
      'HOA fees in NoVA are very common and can be substantial',
      'Traffic in NoVA affects desirability by location',
    ],
    dealWatch: [
      'NoVA HOA rules: verify rental allowances — some communities in Fairfax have rental caps per building',
      'Verify property is not subject to a local tenant protection ordinance (Alexandria, Arlington have stricter rules)',
      'Richmond: Scott\'s Addition and Manchester have strong appreciation; check current trend',
      'Military housing areas (Hampton Roads) benefit from BAH (Basic Allowance for Housing) — very stable renters',
    ],
    warnings: [
      'Northern Virginia HOA rental caps: some condos limit the percentage of units that can be rented — you could buy and not be allowed to rent',
      'Arlington County and Alexandria have tenant-friendly provisions beyond state law',
      'NoVA market is expensive and cap rates are low — very long holding periods needed for acceptable returns',
    ],
  },
  {
    abbr: 'WA', name: 'Washington', landlordRating: 'low', ratingLabel: 'Tenant-Friendly',
    pros: [
      'No state income tax on rental income',
      'Seattle has very high rents driven by tech industry wages',
      'Strong, diverse economy (Amazon, Microsoft, Boeing)',
      'Eastern Washington (Spokane) offers more landlord-friendly environment',
    ],
    cons: [
      'Seattle has adopted just-cause eviction protections — cannot non-renew without cause',
      'Seattle\'s winter prepayment requirements for move-in costs increase tenant acquisition costs',
      'High entry prices in Seattle metro',
      'Wildfire smoke is a growing issue in eastern WA',
    ],
    dealWatch: [
      'Seattle local ordinances: move-in cost caps, just-cause eviction, first-in-time rules — understand all of them',
      'Verify municipality — Seattle, Bellevue, Tacoma, Kirkland all have different ordinances',
      'Spokane offers much more landlord-friendly environment with strong cash flow potential',
      'Wildfire insurance for eastern WA properties is getting harder to obtain',
    ],
    warnings: [
      'Seattle just-cause eviction means you cannot end a tenancy without a qualifying reason — limited flexibility',
      'Some Seattle neighborhoods saw significant property damage during 2020 unrest — check current conditions',
      'First-in-time rule: Seattle landlords must offer tenancy to the first qualified applicant — limits screening',
      'Wildfire risk in eastern WA is growing — verify insurance availability before buying',
    ],
  },
  {
    abbr: 'WV', name: 'West Virginia', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'Lowest entry prices in the US — potential for high gross yields',
      'No rent control statewide',
      'Very landlord-friendly statutes',
      'Low property taxes',
    ],
    cons: [
      'Population has been declining for decades — fundamental demand problem',
      'Economy heavily dependent on declining coal and natural gas industries',
      'Very limited appreciation historically',
      'Extremely illiquid market',
    ],
    dealWatch: [
      'Environmental liens: properties near mining operations can have environmental contamination issues',
      'Subsidence risk from old mine shafts — get a subsidence report in coal country',
      'Verify population trends in target city — many WV towns are shrinking',
      'Charleston and Morgantown (WVU) are the most stable markets in the state',
    ],
    warnings: [
      'Declining population is the fundamental challenge — rental demand can fall even if you find good tenants today',
      'Subsidence from abandoned mines is a real physical risk in many WV counties',
      'Environmental contamination near former industrial and mining sites — always do environmental due diligence',
      'Very illiquid exit market — plan for an indefinite hold',
    ],
  },
  {
    abbr: 'WI', name: 'Wisconsin', landlordRating: 'medium', ratingLabel: 'Moderate',
    pros: [
      'Milwaukee offers some of the best cash flow opportunities in the Midwest',
      'No rent control statewide',
      'Madison (University of Wisconsin) has extremely stable, strong rental demand',
      'Stable, diversified economy',
    ],
    cons: [
      'Milwaukee has significant blight and declining neighborhoods',
      'Madison has a more tenant-friendly environment',
      'Cold winters drive high heating and maintenance costs',
      'Absentee management of Milwaukee properties is very difficult',
    ],
    dealWatch: [
      'Milwaukee: lead paint compliance is strictly enforced — test all pre-1978 properties',
      'Milwaukee north and northwest sides have high crime — always research block by block',
      'Madison: university area rents well but tenant turnover is very high (annual in many cases)',
      'Boiler and furnace age — both work very hard in Wisconsin winters',
    ],
    warnings: [
      'Milwaukee has had some of the largest declines in property values in distressed zip codes',
      'Lead paint liability in Milwaukee is significant — understand Wisconsin\'s lead paint requirements',
      'Self-managing Milwaukee properties from out of state is a high-risk strategy',
    ],
  },
  {
    abbr: 'WY', name: 'Wyoming', landlordRating: 'high', ratingLabel: 'Landlord-Friendly',
    pros: [
      'No state income tax',
      'No rent control',
      'Very landlord-friendly statutes',
      'Very low property taxes',
    ],
    cons: [
      'Extremely limited markets — Cheyenne and Casper are the only real metros',
      'Economy tied to oil, gas, and coal — boom/bust cycles',
      'Extreme cold weather with high operating costs',
      'Essentially no market liquidity',
    ],
    dealWatch: [
      'Energy sector health directly drives rental demand in Casper — check current activity',
      'Heating costs are very high — propane common in rural areas ($4,000-8,000/yr)',
      'Very limited property management availability — often must self-manage',
      'Jackson Hole: luxury STR market but entry prices are extraordinarily high',
    ],
    warnings: [
      'Energy bust can cause dramatic rent declines in Casper — 30-40% drops have occurred',
      'Essentially no exit liquidity — plan for a very long hold',
      'Jackson Hole is one of the most expensive real estate markets in the US — cap rates near 0%',
    ],
  },
];

// ── General Investor Tips ─────────────────────────────────────

export const INVESTOR_TIPS: InvestorTip[] = [
  {
    icon: '💰',
    title: 'Cash Flow Day 1 — Non-Negotiable',
    body: 'Never buy a property that does not cash flow from the day you close. Appreciation is a bonus, not a strategy. If the deal only works if prices go up, it is speculation — not investing. Your mortgage, taxes, insurance, vacancy, and maintenance must all be covered by rent from day one.',
  },
  {
    icon: '🧮',
    title: 'The 1% Rule as a Quick Screen',
    body: 'A quick sanity check: monthly rent should be at least 1% of the purchase price. A $200,000 property should rent for $2,000+/month. This rarely works in expensive coastal markets, but it quickly eliminates deals that will never cash flow. Use it to filter, not to decide.',
  },
  {
    icon: '📋',
    title: 'Never Trust the Seller\'s Numbers',
    body: 'Always build your own proforma from scratch. Sellers present best-case rent, minimal expenses, and ignore vacancy. Get actual tax records, get your own insurance quote, verify current rents, and apply your own vacancy and maintenance assumptions — typically 5-10% vacancy and 5-10% of gross rent for maintenance.',
  },
  {
    icon: '🏚️',
    title: 'Vacancy and Maintenance Are Always Higher Than You Think',
    body: 'Budget at least 5% vacancy (more in soft markets) and 5-8% of gross rents for maintenance annually. Then add a capital expenditure reserve for big-ticket items: roof ($8-15k), HVAC ($5-10k), water heater ($1-2k), appliances. If you don\'t set this aside, one repair can wipe out years of cash flow.',
  },
  {
    icon: '🏢',
    title: 'Property Management Costs Are Real',
    body: 'If you use a property manager, they typically charge 8-12% of monthly rent plus one month\'s rent for placement. Factor this even if you plan to self-manage — if you can\'t afford a PM in your numbers, you can\'t afford to get sick, travel, or take another job. Self-management is a job, not free money.',
  },
  {
    icon: '📍',
    title: 'Location Over Property — Every Time',
    body: 'A mediocre property in a great location will outperform a great property in a mediocre location every single time. Research the neighborhood more than the house. Check schools, crime, walkability, employment drivers, and the 5-year trend. You can renovate a house; you can\'t renovate a neighborhood.',
  },
  {
    icon: '🤝',
    title: 'The Deal is Made at Purchase',
    body: 'You make money when you buy, not when you sell. Overpaying for a property in hopes of forcing appreciation is a losing strategy. Buy below market value, at a price that makes the numbers work at today\'s rents with today\'s expenses. Negotiate hard — every $10,000 off the purchase price is permanent profit.',
  },
  {
    icon: '🚪',
    title: 'Know Your Exit Before You Enter',
    body: 'Before closing, be able to answer: Who will I sell this to and at what price? If your exit plan requires a specific buyer type (flipper, owner-occupant, other investor), make sure that market exists. Liquidity varies enormously by market. Some markets have thin buyer pools — you may hold for years whether you want to or not.',
  },
  {
    icon: '🏦',
    title: 'Build a 6-Month Reserve Fund',
    body: 'Keep at least 6 months of mortgage payments in reserves per property. Vacancies happen, repairs happen, non-payment happens. Running out of cash and being forced to sell at the worst time is how investors lose money. The reserve fund is not an emergency fund — it\'s part of operating the business.',
  },
  {
    icon: '📄',
    title: 'Leases and Screening Are Your First Line of Defense',
    body: 'A strong lease and rigorous tenant screening will prevent most landlord problems. Verify income (3x monthly rent), check credit (620+ minimum), call previous landlords, and run background checks. A bad tenant in a great property is worse than no tenant. Vacancy is recoverable; tenant-caused damage and evictions are expensive.',
  },
  {
    icon: '🔍',
    title: 'Never Skip the Inspection',
    body: 'Always get a professional home inspection, even on new construction. In competitive markets, some investors waive inspections to win — this is a major mistake on a buy-and-hold. Unknown foundation issues, roof age, HVAC problems, or plumbing defects can cost tens of thousands. The $500 inspection is the best insurance you can buy.',
  },
  {
    icon: '📈',
    title: 'Understand the Local Rent Trend Before You Buy',
    body: 'Review actual closed rents in the target area for the past 12 months. Talk to local property managers — they know current demand better than any website. Verify that your projected rent is achievable in current conditions, not peak conditions from 12-18 months ago. Overestimating rent is the fastest way to buy a deal that doesn\'t work.',
  },
  {
    icon: '⚖️',
    title: 'Know the Landlord-Tenant Laws in Your State',
    body: 'Landlord-tenant law is state-specific and sometimes city-specific. Know how long eviction takes in your state, what notice is required, whether rent control applies, what habitability standards you must meet, and how security deposits must be handled. Ignorance of the law is not a defense — and violations can be very costly.',
  },
  {
    icon: '🧱',
    title: 'Debt Service Coverage Ratio (DSCR) Must Be Above 1.25',
    body: 'Your net operating income (NOI) should exceed your annual debt service by at least 25%. A DSCR of 1.0 means rent exactly covers the mortgage — one vacancy and you\'re negative. Lenders typically require 1.25 for investment loans. If your DSCR is below 1.25, the deal has no margin for error.',
  },
  {
    icon: '🌊',
    title: 'Insurance Surprises Kill Deals — Get Quotes Early',
    body: 'Insurance costs vary dramatically by location and property type. In Florida, Texas coastal areas, and wildfire zones, insurance can cost $5,000-15,000+/year on a single-family home. Get a full insurance quote (including flood if applicable) before making an offer — not after going under contract. An uninsurable property is unsellable.',
  },
];
