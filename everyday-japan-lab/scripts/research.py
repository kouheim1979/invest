"""Rebuild the evidence-screened editorial inventory. No estimated market metrics."""
from pathlib import Path
import csv, json

ROOT = Path(__file__).resolve().parents[1]
CHECKED = '2026-09-24'
# A source proves only the scope described here; a catalogue is not a penetration survey.
SOURCE_TEXT = '''
TOTO_HISTORY|TOTO|Manufacturer history / sales report|https://jp.toto.com/company/press/2025_12_09/|Long-running WASHLET business and reported overseas sales; not independent market penetration.
TOTO_FIT|TOTO USA|Model-specific technical drawing|https://www.totousa.com/filemanager_uploads/product_assets/OwnersManual/Washlet-Fit-Chart.pdf|Dimensions vary by model, bowl and tank contour; no universal fit threshold.
BRONDELL_FIT|Brondell|Manufacturer fit guide|https://help.brondell.com/hc/en-us/articles/34579633981709-Fit-Measurement-Guide-Toilet-Compatibility|Overseas fit guidance exists; does not establish search volume.
BRONDELL_MANUAL|Brondell|Product manual|https://www.brondell.com/content/T66_BidetSeat_owners_manual_Web_041923.pdf|Electrical and plumbing rules for the named model, not all bidets.
TOTO_PRODUCTS|TOTO Japan|Product catalogue|https://jp.toto.com/products/|Product availability only; household uptake and export suitability not established.
TOTO_PUBLIC|TOTO Japan|Public restroom catalogue|https://jp.toto.com/products/public/publicrestroomitems/|Commercial restroom products and controls; not an accessibility certification abroad.
TOTO_SOUND|TOTO Japan|Product announcement|https://jp.toto.com/company/press/2026_06_16_02/|Privacy sound and remote-control products; performance claims are manufacturer claims.
ESRI|Cabinet Office Japan|Government statistics index|https://www.esri.cao.go.jp/jp/stat/shouhi/shouhi|Durable-goods survey available; this inventory does not invent or transcribe unverified rates.
BATH|Panasonic|Bathroom catalogue|https://sumai.panasonic.jp/bathroom/bevas/base_plan/|Japanese system-bath product configurations; no national adoption rate.
BATH_HEAT|Mitsubishi Electric|Product catalogue|https://www.mitsubishielectric.co.jp/ldm/ventilationfan/bath/|Bathroom ventilation, heating and drying equipment exists; installation-specific.
IEA_HP|IEA|International market analysis|https://www.iea.org/reports/heat-pump-monitor-2026/key-findings|Mature Japanese heat-pump market and CO2 water heating; regional growth differs.
JRAIA|Japan Refrigeration and Air Conditioning Industry Association|Industry shipment history|https://www.jraia.or.jp/product/heatpump/i_broke.html|EcoCute cumulative shipments exceeded ten million in March 2025; shipments are not installed households.
HP_DESIGN|ENERGY STAR|Government programme technical guidance|https://www.energystar.gov/partner-resources/residential_new/educational_resources/sup_program_guidance/heat_pump_water_heater_guide/design_considerations|US integrated HPWH design constraints; do not transfer these unchanged to split CO2 systems.
HP_INSTALL|ENERGY STAR|Government programme installation guidance|https://www.energystar.gov/partner-resources/residential_new/educational_resources/sup_program_guidance/heat_pump_water_heater_guide/installation_best_practices|Airflow, installation and operating conditions matter.
DOE_HP|US Department of Energy|Technical explanation|https://bsesc.energy.gov/energy-basics/hvac-heat-pump-water-heaters|Heat transfer principle, not a guaranteed seasonal COP.
HEMS|Agency for Natural Resources and Energy|Public energy guidance|https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/what/index.html|HEMS definition and energy management; household saturation not established here.
SMART_METER|Agency for Natural Resources and Energy|Public programme information|https://www.enecho.meti.go.jp/category/electricity_and_gas/electric/fee/stracture/smartmeter.html|Japanese smart-meter programme; data access is country- and utility-specific.
ENERGY_WHITE|Agency for Natural Resources and Energy|Energy white paper|https://www.enecho.meti.go.jp/about/whitepaper/2024/html/3-2-3.html|Programme context for demand response and distributed energy; not proof of universal deployment.
CHADEMO|CHAdeMO Association|Industry technical overview|https://www.chademo.com/technology/v2g|Bidirectional technology exists; vehicle, charger, grid and islanding approval must all match.
ROOM_HEAT|Agency for Natural Resources and Energy|Public household energy guidance|https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/airconditioning/index.html|Room heating and local heating practices; no universal cost advantage.
KITCHEN_ENERGY|Agency for Natural Resources and Energy|Public household energy guidance|https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/kitchen/index.html|Kitchen energy use; actual savings depend on usage and equipment.
INPLUS|LIXIL|Manufacturer retrofit product|https://www.lixil.co.jp/lineup/window/inplus/|Secondary-window product availability; claimed performance requires project-specific evidence.
EST_WINDOWS|Energy Saving Trust|Public-interest technical guidance|https://energysavingtrust.org.uk/advice/windows-and-doors/|Secondary glazing already exists in the UK; overseas novelty must not be claimed.
STOCK|Cabinet Office Japan|Public preparedness guidance|https://www.bousai.go.jp/kyoiku/hokenkyousai/check.html|Three days minimum and preferably a week; roughly 3 L drinking water per person per day. Guidance is not observed adoption.
MAFF|MAFF Japan|Household food-stock guidance|https://www.maff.go.jp/j/zyukyu/foodstock/chapter02.html|Rotate familiar foods; recommendation does not establish household compliance.
CDC_WATER|CDC|Public emergency-water guidance|https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html|At least one US gallon per person per day for three days; aim for two weeks if possible. Scope differs from Japan's drinking-water figure.
TOILET_STOCK|METI Japan|Disaster toilet working-group material|https://www.meti.go.jp/shingikai/mono_info_service/disaster_toilet_popularization/pdf/001_04_00.pdf|Five uses per person per day is a planning assumption; individual and product needs vary.
ANCHOR|Tokyo Fire Department|Public safety guidance|https://www.tfd.metro.tokyo.lg.jp/lfe/bou_topic/kaguten/measures_house.html|Furniture restraint guidance; fixing substrate and installation require verification.
BREAKER|Cabinet Office Japan|Public safety programme|https://www.bousai.go.jp/jishin/kanshin_breaker.html|Earthquake breaker promotion; not a DIY wiring guide or international approval.
GO_BAG|Cabinet Office Japan|Public preparedness checklist|https://www.bousai.go.jp/taisaku/hisaisyagyousei/youengosya/h20/pdf/bizen01.pdf|Historical checklist examples only; not a current complete or individualized plan.
MLIT_DELIVERY|MLIT Japan|Public logistics policy|https://www.mlit.go.jp/seisakutokatsu/freight/re_delivery_reduce.html|Lockers and delivery practices promoted; no measured saving is assumed in this inventory.
LOCKER_HOME|Panasonic|Manufacturer product catalogue|https://sumai.panasonic.jp/exterior/takuhai/combo/combo.html|Home parcel boxes exist; courier acceptance and parcel dimensions vary.
LOCKER_APT|Panasonic|Manufacturer product catalogue|https://sumai.panasonic.jp/exterior/takuhai/combo_maison.html|Apartment parcel lockers exist; service capacity requires site data.
LOCKER_RANGE|Panasonic|Manufacturer comparison catalogue|https://sumai.panasonic.jp/exterior/takuhai/choose/|Different box layouts and functions; not proof of compatibility with every courier.
JP_POST|Japan Post|Operator service catalogue|https://www.post.japanpost.jp/service/|Postal service examples, not evidence equivalent services are absent overseas.
JP_RECEIVE|Japan Post|Operator service guidance|https://www.post.japanpost.jp/service/ec_uketori-biz/|Alternative delivery receipt arrangements; eligibility varies by service.
YAMATO|Yamato Transport|Operator service catalogue|https://www.kuronekoyamato.co.jp/ytc/customer/send/services/|Parcel, airport, sports and round-trip delivery; destination and deadline restrictions apply.
YAMATO_COOL|Yamato Transport|Operator service guidance|https://www.kuronekoyamato.co.jp/ytc/customer/send/services/cool/|Temperature-controlled delivery availability; not a food safety guarantee.
YAMATO_COMPACT|Yamato Transport|Operator service guidance|https://www.kuronekoyamato.co.jp/ytc/customer/send/services/compact/|Specified parcel packaging and service; local equivalents differ.
LAUNDRY|Panasonic|Manufacturer selection guide|https://panasonic.jp/joshitsu/select.html|Laundry dehumidifier product types; no generic energy-saving percentage.
ES_DEHUMID|ENERGY STAR|Government programme product guidance|https://www.energystar.gov/products/dehumidifiers|Dehumidifiers already sold abroad; efficiency and application differ.
MEACO|Meaco UK|Manufacturer product page|https://www.meaco.com/products/meacodry-arete-two-25l-dual-dehumidifier-hepa-air-purifier|Overseas laundry-mode product exists; not independent demand data.
DRY_HARDWARE|Kawaguchi Giken|Manufacturer product catalogue|https://www.kawaguchigiken.co.jp/products/monohoshi/|Indoor rods, lifts and lines; load and fastening must match the exact item.
FUTON|Iris Ohyama|Manufacturer product catalogue|https://www.irisohyama.co.jp/kararie/futon/|Futon and shoe-drying products exist; no clinical or allergen benefit inferred.
FUTON_VAC|Iris Ohyama|Manufacturer product page|https://www.irisohyama.co.jp/products/electrical-appliances/home-appliances/vacuum-cleaner/cleaner-futon/cleaner-bed-with-cord-fca13|Bedding vacuum exists; no health outcome inferred.
WASHER|Panasonic|Manufacturer comparison table|https://panasonic.jp/wash/comparison.html|Heat-pump washer-dryers and automatic dosing available; model features differ.
RICE|Zojirushi USA|Manufacturer overseas product page|https://www.zojirushi.com/app/product/nslgc|Small rice cooker sold in US; specified rice cup is not a US measuring cup.
JEMA|Japan Electrical Manufacturers' Association|Domestic shipment report|https://www.jema-net.or.jp/stat/evefa20000004jb4-att/2512ds-comment.pdf|Domestic appliance shipments; not household penetration or overseas search demand.
THERMAL_COOK|Thermos Japan|Manufacturer product page|https://www.thermos.jp/product/series/kbg-00.html|Vacuum-insulated cooker; follow food-safety and appliance instructions.
RICE_FREEZE|Asahi Kasei|Manufacturer product page|https://www.asahi-kasei.co.jp/saran/products/ziploc/container_gohan.html|Rice freezing containers; temperature and food safety need separate guidance.
MARNA|Marna|Manufacturer container catalogue|https://marna.jp/shop/c/ccontainer/|Food-storage product formats; catalogue alone does not show national uptake.
ZO_PRODUCTS|Zojirushi Japan|Manufacturer product catalogue|https://www.zojirushi.co.jp/syohin/|Kitchen appliance and insulated-container availability only.
ZO_POT|Zojirushi Japan|Manufacturer product specification|https://www.zojirushi.co.jp/syohin/pot_kettle/ve_electric_thermos/cv-gv/|Electric vacuum-insulated water pot; running cost depends on measured use.
ZO_BENTO|Zojirushi Japan|Manufacturer product catalogue|https://www.zojirushi.co.jp/syohin/bento/|Insulated lunch systems; holding time is product- and food-specific.
DISHWASHER|Panasonic|Manufacturer product page|https://sumai.panasonic.jp/dishwasher/m9series/|Built-in drawer dishwasher exists; plumbing and cabinet requirements vary.
DISH45|Panasonic|Manufacturer product page|https://sumai.panasonic.jp/dishwasher/products/front-open-45ef1w/|45 cm dishwasher format; overseas alternatives are established.
MUJI|MUJI|Manufacturer design explanation|https://www.muji.com/hk-en/campaign/20SS_storage/size.html|Modular sizing design in a 2020 campaign; not a current sales or adoption statistic.
MUJI_GLOBAL|MUJI|Overseas product guidance|https://www.muji.com/sg/feature/organise/|Overseas storage availability; no untapped-market claim.
INTERIOR|Panasonic|Manufacturer interior catalogue|https://sumai.panasonic.jp/housing-biz/interior/|Storage, partitions, counters and fittings exist; no national adoption proof.
TATAMI|Panasonic|Manufacturer product concept|https://sumai.panasonic.jp/interior/miriyo/tatamigaoka/concept/|Raised tatami storage product; load, fall and moisture checks remain project-specific.
BIKE_STATS|Japan Bicycle Promotion Institute|Industry production statistics|https://jbpi.or.jp/business/statistics/production/electric/|Domestic electric-assist production statistics; not household adoption abroad.
YAMAHA|Yamaha Motor|Manufacturer product catalogue|https://www.yamaha-motor.co.jp/pas/lineup/|Electric-assist bicycle uses and products; local class rules differ.
BIKE_CHILD|Yamaha Motor|Manufacturer safety guidance|https://www.yamaha-motor.co.jp/pas/children/safe-usage/|Child transport needs approved compatible equipment and local rules.
BIKE_PARK|GIKEN|Manufacturer infrastructure overview|https://www.giken.com/ja/products/eco_cycle/|Automated cycle parking exists; specialty infrastructure, not general household equipment.
CAR_PARK|MLIT Japan|Public infrastructure safety guidance|https://www.mlit.go.jp/toshi/toshi_gairo_tk_000038.html|Mechanical parking safety and constraints; engineering and operator responsibility.
CARE|Panasonic Age-Free|Manufacturer care product catalogue|https://sumai.panasonic.jp/agefree/products/mobility/smoody/lineup-n.html|Support hardware exists; personal assessment and installation cannot be automated safely.
CARE_TOILET|Panasonic Age-Free|Manufacturer renovation examples|https://sumai.panasonic.jp/agefree/shop/reform/toilet/|Accessible layout examples; not medical or building-code clearance.
MIMAMORI|Zojirushi|Manufacturer service history|https://www.zojirushi.co.jp/corp/sustainable-action/mimamori.html|Kettle activity monitoring service; not an emergency detection service.
JICA|JICA|Public international cooperation programme|https://www.jica.go.jp/english/overseas/egypt/activities/activity12.html|Adapted Japanese school activities overseas; not proof each sub-practice is commercially viable.
SCHOOL|MEXT|Public school hygiene guidance|https://www.mext.go.jp/a_menu/kenko/hoken/1353625.htm|School hygiene context; topic-specific evidence still required.
SCHOOL_FOOD|MEXT|Public school food guidance|https://www.mext.go.jp/a_menu/sports/syokuiku/08040316.htm|School food hygiene; not a home meal safety protocol.
GLORY_TICKET|GLORY|Manufacturer commercial catalogue|https://www.glory.co.jp/product/category_detail/contents_type%3D25|Ticket vending and self-ordering equipment; integration and payment rules vary.
GLORY_CASH|GLORY|Manufacturer commercial product|https://www.glory.co.jp/tsurisenki/products/380/|Automatic cash recycling equipment exists; business case needs actual transaction data.
GLORY_KEYS|GLORY|Manufacturer commercial catalogue|https://www.glory.co.jp/product/bcategory/sc/|Key-management and related retail systems; catalogue alone does not show uptake.
SEVEN_PRINT|Seven-Eleven Japan|Operator service guide|https://www.sej.co.jp/services/multicopy/|Convenience-store printing and document services exist; identity services excluded from priority.
KAO_REFILL|Kao|Manufacturer sustainability account|https://www.kao.com/global/en/sustainability/planet/zero-waste/refill-replacements/|Long-running Japanese refill business; material claims are company-specific, not universal lifecycle results.
KAO_DOSE|Kao|Manufacturer lifecycle explanation|https://www.kao.com/global/en/sustainability/nature/environment/lca-story-attackzero/|Concentrated detergent example; doses and lifecycle boundaries differ by product.
KAO_COLLECTION|Kao|Manufacturer pilot announcement|https://www.kao.com/global/en/newsroom/news/release/2024/20240308-001/|Pouch collection programme example; do not describe a pilot as national infrastructure.
'''
sources = {}
for line in SOURCE_TEXT.strip().splitlines():
    key, publisher, kind, url, scope = line.split('|')
    sources[key] = dict(id=key,publisher=publisher,type=kind,url=url,scope=scope,checked=CHECKED)

# Topic | sources | query hypothesis | useful tool | limiting condition
GROUPS = {
'Bath & hygiene': '''
Electric bidet seats|TOTO_HISTORY,TOTO_FIT,BRONDELL_FIT|will a bidet seat fit my toilet|Measurement and readiness worksheet|Electrical protection, backflow rules and exact bowl contour
Non-electric bidet attachments|TOTO_PRODUCTS,BRONDELL_FIT|bidet without electricity installation|Plumbing and clearance checklist|Separate product manual needed; catalogue evidence incomplete
Heated toilet seats|TOTO_PRODUCTS,ESRI|heated toilet seat electricity cost|Measured-power cost calculator|Electrical product approval and standby energy
Portable travel bidets|TOTO_PRODUCTS|portable bidet bottle vs electric|Travel feature comparison|Water source and cleaning; no medical claims
Bath reheating loops|BATH|Japanese bath reheat retrofit|Installer question list|Specific reheat model manual and local plumbing evidence needed
Insulated bath covers|BATH|insulated bathtub lid heat loss|Measured cooling comparison worksheet|No universal heat-retention or savings claim
Bathroom heater dryers|BATH_HEAT|bathroom heater dryer installation|Ventilation and circuit checklist|Moisture, wet-zone electrical and exhaust requirements
Prefabricated unit bathrooms|BATH|Japanese unit bathroom dimensions|Envelope and service access worksheet|Construction standards and waterproofing differ
Compact handwash basins|TOTO_PRODUCTS|small toilet handwash basin dimensions|Clearance checklist|Local accessibility and plumbing rules
Touchless washbasin taps|TOTO_PRODUCTS|sensor faucet battery maintenance|Maintenance comparison|Not uniquely Japanese; established global competition
Consistent restroom button layouts|TOTO_PUBLIC|accessible toilet button layout|Control-label audit|Jurisdiction-specific accessibility; no automatic compliance verdict
Toilet sound masking|TOTO_SOUND|toilet privacy sound device|Preference and power checklist|Vendor claims; privacy needs vary culturally
''',
'Energy & retrofit': '''
Heat-pump water heating / EcoCute|IEA_HP,JRAIA,HP_DESIGN|heat pump water heater running cost|Transparent energy and cost calculator|Split CO2 and indoor integrated systems have different conditions
Ductless room heat pumps|IEA_HP,ROOM_HEAT|mini split vs central heat room sizing|Room survey for contractor|Already mature in many countries; no automatic HVAC sizing
Home energy management systems|HEMS|HEMS device compatibility|Protocol and tariff checklist|Vendor ecosystems and data access
Solar battery EV coordination|ENERGY_WHITE,CHADEMO|solar battery EV priority settings|Household load scheduling worksheet|Grid approval; professional system design
Vehicle-to-home backup|CHADEMO|V2H backup runtime|Energy budget calculator|Japanese technology maturity is not widespread household adoption
Smart-meter consumption feedback|SMART_METER|download smart meter energy data|Local-data tariff comparison|Access permissions, privacy and tariff complexity
Household demand response|ENERGY_WHITE|home demand response peak tariff|Shiftable-load inventory|Programme-specific rates and rules; defer financial promises
Secondary interior glazing|INPLUS,EST_WINDOWS|secondary glazing window measurement|Measurement and quote checklist|Already established in UK; permission, moisture and escape routes
Kotatsu local heating|ROOM_HEAT|kotatsu running cost|Power and usage cost calculator|Fire precautions; not whole-room heating
Electric floor mats|ROOM_HEAT|electric heated mat energy use|Power-time calculator|Temperature, product instructions and trip hazards
Room-by-room heating schedules|ROOM_HEAT|heat one room or whole house|Usage scenario comparison|Condensation and building fabric; no fixed savings
Vacuum-insulated electric water pots|ZO_POT,KITCHEN_ENERGY|water boiler vs kettle running cost|Measured daily-use comparison|100 V imports, standing losses and scalding
Induction cooking in compact homes|KITCHEN_ENERGY,ZO_PRODUCTS|portable induction cooker power requirements|Circuit and cookware checklist|Confirm a specific model; established overseas market
''',
'Preparedness': '''
Rolling household food stocks|STOCK,MAFF|emergency food stock calculator|Stock deficit and rotation planner|Public recommendation does not mean universal household practice
Household emergency water storage|STOCK,CDC_WATER|how much emergency water per person|Water and container calculator|Local guidance, heat, pets and sanitation needs
Emergency toilet bags and liners|TOILET_STOCK,STOCK|emergency toilet bags how many|Use-count and reorder calculator|Waste disposal and sewer conditions are local
Furniture anti-tip restraints|ANCHOR|earthquake furniture anchor wall type|Room risk inventory|No anchor strength or structural safety certification
Earthquake-sensitive breakers|BREAKER|earthquake breaker retrofit|Electrician preparation checklist|Electrical and life-safety work; priority reduced
Household evacuation bags|GO_BAG,STOCK|emergency bag weight checklist|Packing and weight worksheet|Old checklist is context only; refresh with local authority
Battery emergency radio planning|GO_BAG|emergency radio batteries runtime|Battery inventory|Radio standards and alert coverage vary
No-cook outage meal planning|MAFF,STOCK|emergency food without cooking|Shelf-stable menu coverage worksheet|Nutrition, allergies and food safety need individual attention
Apartment outage supply placement|STOCK|store emergency water small apartment|Space and weight inventory|Floor loading and evacuation routes need local assessment
Emergency lighting distribution|GO_BAG|power outage flashlight for each room|Room and battery checklist|Avoid treating consumer lights as code-compliant emergency lighting
''',
'Delivery & logistics': '''
Apartment parcel lockers|MLIT_DELIVERY,LOCKER_APT|how many parcel lockers for apartments|Capacity sensitivity estimator|Dwell time, peaks, sizes and courier participation
Home parcel boxes|LOCKER_HOME,MLIT_DELIVERY|parcel delivery box size|Largest-parcel dimension checker|Theft resistance and courier acceptance not guaranteed
Unattended delivery instructions|MLIT_DELIVERY|safe parcel drop off instructions|Property permission checklist|Liability and weather protection vary
Scheduled parcel receipt|YAMATO|parcel delivery time window planning|Household availability planner|Service windows cannot be transplanted between countries
Post-office parcel collection|JP_RECEIVE,JP_POST|parcel pickup post office alternative|Travel and opening-hours comparison|Local carrier eligibility
Convenience-store parcel collection|JP_RECEIVE|convenience store parcel pickup|Collection route checklist|Confirm specific supported merchants and carrier
Carrier pickup locations|YAMATO|collect parcel from delivery depot|Receipt option comparison|Identity and holding-time rules are operator-specific
Standard-size small parcel packaging|YAMATO_COMPACT|small parcel box dimensions|Fit and packing checker|Rates and eligibility vary; no live price claim
Temperature-controlled parcel delivery|YAMATO_COOL|cold parcel shipping requirements|Sender preparation checklist|Food safety and cold chain risk; lower priority
Airport luggage forwarding|YAMATO|luggage delivery airport deadline|Timing and destination checklist|Destination acceptance and cutoff dates
Sports equipment forwarding|YAMATO|ship ski golf bag to resort|Equipment-size and deadline worksheet|Transport insurance and destination rules; do not interpret contracts
Parcel return and dispatch boxes|LOCKER_RANGE|parcel box return pickup|Courier and lock-workflow checklist|Outbound collection support is model-specific
''',
'Laundry': '''
Dehumidifier-assisted indoor drying|LAUNDRY,ES_DEHUMID,MEACO|dehumidifier laundry drying cost|Measured energy and room-readiness worksheet|Humidity, temperature and airflow; no generic drying-time guarantee
Ceiling laundry rods and lifts|DRY_HARDWARE|ceiling drying rack load clearance|Reach and load inventory|Fixing strength must be verified
Wall-mounted foldaway drying racks|DRY_HARDWARE|folding indoor drying rack clearance|Open/closed dimension checker|Wall substrate and escape paths
Retractable indoor clotheslines|DRY_HARDWARE|indoor retractable clothesline length|Span and placement checklist|Load is model-specific; child safety
Futon drying appliances|FUTON|futon dryer bedding compatibility|Material and voltage checklist|No allergy or disinfection benefit asserted
Bedding vacuum cleaners|FUTON_VAC|futon vacuum maintenance|Filter and maintenance comparison|Health claims need independent evidence; defer recommendations
Shoe drying appliances|FUTON|shoe dryer material compatibility|Care-label checklist|Heat-sensitive adhesives and fabrics
Heat-pump washer dryers|WASHER,JEMA|washer dryer installation dimensions|Doorway and service-space checker|Power, drainage, capacity and drying test conditions
Automatic laundry detergent dosing|WASHER|auto dosing washer detergent concentration|Dose conversion worksheet|Detergent compatibility and cleaning requirements
''',
'Kitchen & food storage': '''
Compact rice cookers|RICE,JEMA|3 cup rice cooker size servings|Rice-cup and batch planner|Rice cup versus US cup; overseas models already established
Vacuum-insulated thermal cookers|THERMAL_COOK|thermal cooker pot capacity|Capacity and recipe checklist|Food safety needs manufacturer time-temperature rules
Portioned rice freezing containers|RICE_FREEZE|rice freezer containers portions|Batch and freezer-space planner|No unsupported safe storage-duration claim
Dry-food storage containers|MARNA|airtight pantry containers shelf fit|Shelf dimension checker|Food compatibility and seal maintenance
Insulated lunch boxes|ZO_BENTO|insulated bento lunch box capacity|Portion and bag-fit worksheet|Holding time is not guaranteed food safety
Vacuum food jars|ZO_PRODUCTS|soup jar capacity cleaning|Opening and cleaning comparison|Thermal performance depends on food and preparation
Drawer dishwashers|DISHWASHER|drawer dishwasher cabinet dimensions|Retrofit measurements|Plumbing, electrical and cabinet access
Narrow built-in dishwashers|DISH45|45 cm dishwasher fit|Cabinet and door-swing checker|Widely available outside Japan; regional dimensions
Rice cooker keep-warm routines|KITCHEN_ENERGY|rice cooker keep warm electricity|Measured energy comparison|Separate energy planning from food safety
Electric tabletop cooking appliances|ZO_PRODUCTS|electric hot plate table clearance|Circuit and space checklist|Burns, children and cable routing
Home bread-making appliances|ZO_PRODUCTS|bread maker loaf size kitchen space|Batch and counter-space comparison|Mature global category; weak Japan-specific advantage
Insulated reusable drink bottles|ZO_PRODUCTS|vacuum bottle size replacement seals|Fit and maintenance checklist|Highly competitive global category
''',
'Space & interiors': '''
Modular storage dimensions|MUJI,MUJI_GLOBAL|storage box shelf dimension calculator|Box nesting and clearance checker|Not an undiscovered overseas market; distinguish nominal from usable size
Entryway shoe storage|INTERIOR|small entryway shoe cabinet dimensions|Capacity and circulation worksheet|Ventilation, access and tip-over safety
Underfloor storage hatches|INTERIOR|underfloor storage access hatch|Use-case and inspection checklist|Moisture, structure, utilities and pests; professional review
Raised tatami storage|TATAMI|tatami platform storage room layout|Footprint and access planner|Load, fall edges and moisture
Loft access ladders|INTERIOR|loft ladder clearance footprint|Survey sheet|Fall and egress risk; no installation instructions
Sliding room partitions|INTERIOR|sliding partition space clearance|Opening-envelope comparison|Fire, acoustic and structural requirements
Interior borrowed-light windows|INTERIOR|interior window daylight privacy|Location and privacy matrix|No daylight-performance promise; structure and fire rules
Wall-mounted utility shelves|INTERIOR|utility room wall shelf depth|Storage and obstruction checker|Fasteners and wall loading require assessment
Compact work counters|INTERIOR|small home work counter depth|Desk and chair-clearance worksheet|Ergonomics vary; no medical claims
Wall-panel renovation systems|INTERIOR|interior wall panel retrofit|Substrate and maintenance checklist|Moisture, fire rating and emissions certification
Reconfigurable room storage units|MUJI,INTERIOR|modular furniture move house|Module inventory and reuse planner|Long-term component availability unverified
Floor-level sitting layouts|TATAMI,INTERIOR|floor seating room storage layout|Furniture footprint comparison|Accessibility and personal comfort; not suitable for everyone
''',
'Mobility & parking': '''
Utility electric-assist bicycles|BIKE_STATS,YAMAHA|electric commuter bike range cargo|Route and charging checklist|Local speed/power rules; range not guaranteed
Child-carrying electric bicycles|BIKE_CHILD,YAMAHA|child seat electric bike compatibility|Manufacturer-document checklist|High safety exposure; no universal child-seat pass
Small-wheel urban electric bicycles|YAMAHA|small wheel e bike storage dimensions|Lift and parking-space checker|Handling and load limits vary
Cycle battery replacement planning|YAMAHA|e bike replacement battery compatibility|Model identifier checklist|Official battery only; no battery modification guidance
Automated underground cycle parking|BIKE_PARK|automated bicycle parking dimensions|Site feasibility questions|Specialty capital project; not broadly adopted everywhere
Relocatable automated cycle parking|BIKE_PARK|temporary automated bicycle parking|Operator requirements matrix|Separate product evidence and engineering needed
Mechanical car parking fit|CAR_PARK|mechanical parking car height weight|Vehicle-spec collection sheet|Never output safe-to-park verdict; operator limit controls
Mechanical parking operations|CAR_PARK|apartment mechanical parking maintenance|Contractor question list|Life safety and legal contracts; low editorial priority
''',
'Ageing & accessibility': '''
Freestanding support rails|CARE|freestanding support rail room fit|Professional consultation worksheet|Fall risk; assessment required, no suitability verdict
Toilet grab rail retrofits|CARE_TOILET|toilet grab rail installation measurements|Installer survey sheet|Structure, user needs and local standards
Accessible sliding toilet doors|CARE_TOILET|sliding toilet door wheelchair space|Dimension recording sheet|No automatic accessibility compliance claim
Appliance-use activity monitoring|MIMAMORI|elderly kettle activity monitor privacy|Consent and reliability checklist|Not emergency detection; subscription and privacy constraints
Simplified restroom controls|TOTO_PUBLIC|easy to read bidet controls|Control-label comparison|Individual ability and accessibility standards
Bathroom access renovation|BATH,CARE_TOILET|bathroom renovation accessibility checklist|Professional brief template|High harm risk; topic-specific evidence still needed
''',
'School & shared routines': '''
Student-led classroom cleaning routines|JICA|school classroom cleaning rotation|Age-appropriate duty rota|Programme context only; safeguarding and hygiene oversight
Classroom meeting routines|JICA|classroom meeting agenda students|Meeting agenda template|Adapt pedagogy locally; commercial value uncertain
Rotating classroom responsibilities|JICA|classroom job rotation planner|Fair rotation scheduler|JICA programme context; exact practice needs school sources
School shared hygiene checklists|SCHOOL|school shared supplies hygiene checklist|Supply inventory|Public health guidance is local; lower priority
School lunch service workflow|SCHOOL_FOOD|school lunch service checklist|Non-food-safety logistics checklist|Allergies and food safety need qualified oversight
''',
'Retail & urban services': '''
Restaurant meal-ticket vending|GLORY_TICKET|restaurant ticket vending workflow|Queue observation worksheet|Payment systems, accessibility and service culture
Self-ordering kiosks|GLORY_TICKET|self order kiosk small restaurant|Workflow and footprint matrix|Strong established global competitors
Automatic cash recyclers|GLORY_CASH|cash recycler small business time saving|Observed transaction-time comparison|Use actual business data; no guaranteed return
Shared key-management lockers|GLORY_KEYS|electronic key cabinet audit trail|Access and retention requirements|Privacy, access control and security assessment
Convenience-store document printing|SEVEN_PRINT|print documents without home printer|Trip and print-volume comparison|Provider coverage, document privacy and local pricing
Retail document-service counters|SEVEN_PRINT|shared public printer privacy checklist|File removal checklist|Identity/certificate services excluded; high competition
''',
'Refill & resource use': '''
Refill pouch household products|KAO_REFILL|refill pouch vs bottle cost per use|Unit-price and usable-volume calculator|No automatic environmental benefit; packaging and disposal differ
Concentrated detergent dosing|KAO_DOSE|detergent cost per wash concentration|Dose and cost-per-wash calculator|Manufacturer dosing instructions and water hardness
Reusable refill dispenser systems|KAO_REFILL|refill pouch dispenser compatibility|Neck and pouch-fit checklist|Hygiene and compatible materials; no mixing products
Used-pouch collection schemes|KAO_COLLECTION|refill pouch recycling near me|Local acceptance checklist|Pilot programmes are not universal recycling access
Refill stock and reorder routines|KAO_REFILL|household refill inventory tracker|Consumption and reorder worksheet|Avoid overbuying; practical habit not evidence of national adoption
'''
}

commercial = {
'Bath & hygiene': ('Bathroom equipment / installers','Retail links possible; programme approval unverified','High: manufacturers publish fit guides','Medium: water and electrical installation'),
'Energy & retrofit': ('Energy equipment / qualified installers','Local lead referrals possible; agreement unverified','High: utilities and manufacturers','High: electrical, plumbing and grid work'),
'Preparedness': ('Preparedness supplies / storage','Retail links possible; programme approval unverified','High: public agencies and retailers','Medium to high: emergency needs vary'),
'Delivery & logistics': ('Locker vendors / property services','Often B2B referral rather than retail; unverified','Medium: vendor tools and carrier guides','Medium: access, fire routes and liability'),
'Laundry': ('Appliances / drying hardware','Retail links possible; programme approval unverified','High: product comparison and retailer pages','Medium: mounting, heat and electricity'),
'Kitchen & food storage': ('Appliances / containers','Retail links possible; programme approval unverified','High: major retailers and recipe sites','Medium: hot food, electricity and food safety'),
'Space & interiors': ('Furniture / storage / renovation','Retail links possible; installer programmes unverified','High: retailers and interior publishers','Medium: loads, mounting and circulation'),
'Mobility & parking': ('Bicycle retailers / infrastructure vendors','Bikes possible; infrastructure referrals unverified','High: specialist retailers and operators','High: road, child and mechanical safety'),
'Ageing & accessibility': ('Specialist equipment providers','Possible but suitability risk is high','High: specialist providers','High: falls, medical-adjacent and privacy'),
'School & shared routines': ('Educational supplies; uncertain fit','Limited and unverified','Medium: free teacher resources','Medium to high: children and hygiene'),
'Retail & urban services': ('Commercial systems vendors','B2B referral potential, unverified','High: established platform vendors','Medium: payments, privacy and access'),
'Refill & resource use': ('Household goods / dispensers','Retail links possible; programme approval unverified','High: supermarkets and household brands','Low to medium: dosing, materials and hygiene')
}

rows=[]
for group, raw in GROUPS.items():
    ad, aff, comp, safety = commercial[group]
    for line in raw.strip().splitlines():
        topic, keys, query, tool, limit=line.split('|')
        ss=keys.split(',')
        assert all(k in sources for k in ss), ss
        maturity='Catalogue/service confirmed; national uptake not established'
        if group in ['Preparedness','School & shared routines']:
            maturity='Public guidance/programme established; actual household or school uptake not measured here'
        if any(k in ss for k in ['IEA_HP','JRAIA','JEMA','BIKE_STATS','TOTO_HISTORY']):
            maturity='Established industry/history evidence; no unverified household penetration figure'
        if topic in ['Used-pouch collection schemes','Automated underground cycle parking','Relocatable automated cycle parking','Vehicle-to-home backup','Appliance-use activity monitoring']:
            maturity='Specialty/pilot or limited application; does not meet a blanket everyday-adoption claim'
        rows.append(dict(id=f'C{len(rows)+1:03}',category=group,topic=topic,japan_maturity=maturity,
            overseas_room='Segment-specific hypothesis; adoption gap and search volume not measured',
            search_intent=query,purchase_need='Pre-purchase or implementation comparison' if 'checklist' not in tool.lower() else 'Readiness / implementation research',
            advertiser_fit=ad,affiliate=aff,competition=comp+' (editorial estimate; no keyword audit)',
            toolability=tool,primary_information='Primary reference available; scope and missing evidence recorded',
            safety=safety,limit=limit,sources=ss,source_urls=' | '.join(sources[k]['url'] for k in ss),
            status='Hold for topic-specific validation',priority='',checked=CHECKED))

TOP = [
('Electric bidet seats','US / Canada; then locally approved UK/EU models','A buyer can avoid an incompatible seat before ordering. Manufacturer fit charts make a documented worksheet possible.','Existing retailer guides are strong; differentiate by recording unknowns, regional electrics and no universal pass.'),
('Heat-pump water heating / EcoCute','US replacement buyers; compare local systems before Australia/Europe','A transparent load model connects household use to quotes while explaining why Japanese split CO2 systems differ.','High purchase intent is an editorial hypothesis; installation and seasonal performance dominate results.'),
('Rolling household food stocks','English-speaking households with limited storage','Turns an intimidating list into existing-stock subtraction and a repeatable shopping habit.','Public recommendations establish the method, not how many Japanese households follow it.'),
('Apartment parcel lockers','Small apartment managers in US/UK/Australia','Managers can collect delivery and dwell-time data before requesting a capacity quote.','Commercial lead potential, but no confirmed affiliate programme or service-level guarantee.'),
('Dehumidifier-assisted indoor drying','Damp-climate renters in UK/Ireland; other regions selectively','Compare energy use and room conditions when outdoor drying is unreliable.','Already an active overseas category; no claim it is undiscovered or always cheaper than a dryer.'),
('Compact rice cookers','US/Canada small households','Capacity labels and rice-cup units create a solvable buying problem.','Highly competitive; start with batch planning rather than untested product rankings.'),
('Modular storage dimensions','Small urban homes across English-language markets','A usable-interior-size checker can prevent boxes that almost fit.','Global category; Japanese dimension systems are a case study, not a superiority claim.'),
('Refill pouch household products','Markets with locally stocked refill products','Cost per usable dose clarifies misleading pack-size comparisons.','Do not infer environmental benefit from smaller packaging alone; recycling varies.'),
('Secondary interior glazing','Single-glazed homes where landlord/building permission allows','A measurement and installer-questions page supports an expensive, detail-sensitive decision.','UK already has mature secondary glazing. Validate a narrow local search gap before writing.'),
('Emergency toilet bags and liners','Households planning for water/sewer interruptions','Separates toilet uses from people-days and adds storage/disposal questions.','Preparedness recommendation is stronger than adoption evidence; no safe-disposal instructions without local sources.')
]
clusters=[]
for n,(topic,region,reason,warning) in enumerate(TOP,1):
    row=next(r for r in rows if r['topic']==topic)
    row.update(priority=str(n),status='Publish first' if n<=3 else 'Shortlist: validate target region',overseas_room=f'{region}: problem-led opportunity hypothesis; volumes not measured')
    clusters.append(dict(priority=n,id=row['id'],topic=topic,region=region,reason=reason,caution=warning,tool=row['toolability']))

assert len(rows)==110, len(rows)
assert len({r['topic'] for r in rows})==110
(ROOT/'research/sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n')
(ROOT/'research/candidates.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
(ROOT/'research/top10.json').write_text(json.dumps(clusters,ensure_ascii=False,indent=2)+'\n')
with (ROOT/'research/candidates.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows({**r,'sources':', '.join(r['sources'])} for r in rows)
print(f'{len(rows)} candidates; {len(sources)} primary references; {len(clusters)} shortlisted themes')
