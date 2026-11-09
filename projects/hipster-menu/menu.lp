% =====================================================================
%  Hipster Menu Generator, in Answer Set Programming (clingo)
%  Every answer set is a menu that obeys the Laws of Artisanal Dining.
%  Inspired by the 2015 Brooklyn Bar Menu Generator.
% =====================================================================

#const n_small     = 5.
#const n_large     = 4.
#const n_cocktails = 6.

% ---------------------------------------------------------------------
%  VOCABULARY
% ---------------------------------------------------------------------

% ingredient(Name, Kind, Pretension)
ingredient("pork belly",                protein, 2).
ingredient("bone marrow",               protein, 3).
ingredient("duck heart",                protein, 4).
ingredient("beef cheek",                protein, 3).
ingredient("rabbit",                    protein, 3).
ingredient("octopus",                   protein, 3).
ingredient("heritage chicken",          protein, 2).
ingredient("lamb neck",                 protein, 3).
ingredient("uni",                       protein, 4).
ingredient("house-made lardo",          protein, 4).
ingredient("sweetbreads",               protein, 4).
ingredient("wagyu tongue",              protein, 4).
ingredient("heritage pork jowl",        protein, 3).
ingredient("tilefish crudo",            protein, 3).
ingredient("squab",                     protein, 4).
ingredient("goat shoulder",             protein, 3).

ingredient("ramps",                     veg, 3).
ingredient("fiddlehead ferns",          veg, 4).
ingredient("heirloom carrots",          veg, 2).
ingredient("lacinato kale",             veg, 2).
ingredient("sunchokes",                 veg, 3).
ingredient("maitake",                   veg, 3).
ingredient("purple potatoes",           veg, 2).
ingredient("brussels sprouts",          veg, 1).
ingredient("stinging nettles",          veg, 3).
ingredient("romanesco",                 veg, 2).
ingredient("salsify",                   veg, 4).
ingredient("garlic scapes",             veg, 3).
ingredient("chicories",                 veg, 2).
ingredient("delicata squash",           veg, 2).
ingredient("foraged sea beans",         veg, 4).
ingredient("celeriac",                  veg, 2).

ingredient("burrata",                   cheese, 2).
ingredient("local chevre",              cheese, 3).
ingredient("cave-aged cheddar",         cheese, 3).
ingredient("raw-milk tomme",            cheese, 4).
ingredient("whipped ricotta",           cheese, 2).

ingredient("pickled quail egg",         side, 3).
ingredient("pickled mustard seeds",     side, 2).
ingredient("bone broth",                side, 2).
ingredient("farro",                     side, 2).
ingredient("kimchi",                    side, 2).
ingredient("black garlic aioli",        side, 3).
ingredient("smoked labneh",             side, 3).
ingredient("heirloom-mill grits",       side, 3).
ingredient("hand-churned cultured butter", side, 3).
ingredient("fermented chili jam",       side, 3).
ingredient("koji-aged rice",            side, 4).
ingredient("sourdough crumb",           side, 2).
ingredient("pickled green strawberries", side, 4).
ingredient("whey-poached barley",       side, 3).

ingredient("microgreens",               garnish, 1).
ingredient("edible flowers",            garnish, 2).
ingredient("bee pollen",                garnish, 3).
ingredient("smoked sea salt",           garnish, 2).
ingredient("chili crisp",               garnish, 1).
ingredient("foraged nasturtium",        garnish, 3).
ingredient("fennel pollen",             garnish, 4).
ingredient("shaved truffle",            garnish, 4).
ingredient("a single gold leaf",        garnish, 5).
ingredient("rooftop honey",             garnish, 2).
ingredient("charred scallion ash",      garnish, 3).
ingredient("pine needle oil",           garnish, 3).
ingredient("crispy chicken skin",       garnish, 2).
ingredient("a quenelle of something",   garnish, 4).
ingredient("dehydrated kombucha leather", garnish, 5).

% tag(Thing, Tag) — the buzzwords
tag("ramps", foraged).            tag("fiddlehead ferns", foraged).
tag("maitake", foraged).          tag("stinging nettles", foraged).
tag("foraged nasturtium", foraged).
tag("pickled quail egg", pickled). tag("pickled mustard seeds", pickled).
tag("heritage chicken", heritage). tag("heirloom carrots", heritage).
tag("purple potatoes", heritage).  tag("heirloom-mill grits", heritage).
tag("farro", heritage).
tag("kimchi", fermented).          tag("black garlic aioli", fermented).
tag("house-made lardo", house).    tag("hand-churned cultured butter", house).
tag("local chevre", local).        tag("rooftop honey", local).
tag("heritage pork jowl", heritage). tag("foraged sea beans", foraged).
tag("garlic scapes", foraged).     tag("pickled green strawberries", pickled).
tag("fermented chili jam", fermented). tag("koji-aged rice", fermented).
tag("sourdough crumb", house).     tag("whey-poached barley", local).
tag("raw-milk tomme", local).      tag("pine needle oil", foraged).

trendy(foraged; pickled; heritage; fermented; house; local).

% preparation(Name, Pretension)
preparation("charred",        1).
preparation("smoked",         1).
preparation("wood-fired",     2).
preparation("slow-braised",   2).
preparation("salt-baked",     2).
preparation("sous-vide",      3).
preparation("ash-roasted",    3).
preparation("house-cured",    3).
preparation("hay-smoked",     4).
preparation("deconstructed",  4).
preparation("coal-kissed",    2).
preparation("cedar-planked",  2).
preparation("dry-aged",       3).
preparation("koji-rubbed",    3).
preparation("cold-smoked",    2).
preparation("embered",        3).

% which kinds can headline which section
main_ok(small, veg). main_ok(small, cheese). main_ok(small, protein).
main_ok(large, protein).
side_ok(veg). side_ok(side).

% --- bar ---
spirit("rye", 1).          spirit("bourbon", 1).      spirit("mezcal", 2).
spirit("small-batch gin", 2). spirit("pisco", 2).     spirit("applejack", 2).
spirit("amaro", 2).        spirit("aquavit", 3).      spirit("Gowanus-distilled moonshine", 3).
spirit("sotol", 3).        spirit("calvados", 2).     spirit("barrel-aged genever", 3).
spirit("white whiskey", 2). spirit("fernet", 2).      spirit("shochu", 3).
spirit("rhum agricole", 3). spirit("baijiu", 4).      spirit("cask-strength single malt", 3).

modifier("beet shrub", 2).        modifier("house bitters", 2).
modifier("activated charcoal", 3). modifier("lavender syrup", 2).
modifier("smoked maple", 2).      modifier("rosemary smoke", 3).
modifier("celery tincture", 3).   modifier("kombucha", 2).
modifier("pickle brine", 2).      modifier("bacon fat", 3).
modifier("yuzu", 2).              modifier("egg white foam", 2).
modifier("birch sap", 4).         modifier("cold brew", 2).
modifier("hickory-smoked honey", 3). modifier("applewood smoke", 3).
modifier("lapsang souchong syrup", 3). modifier("burnt sugar", 2).
modifier("verjus", 3).            modifier("aquafaba", 3).
modifier("cardamom tincture", 3). modifier("brown butter wash", 4).
modifier("sea buckthorn", 4).     modifier("fig leaf cordial", 3).
modifier("matcha", 2).            modifier("olive oil wash", 3).
modifier("hibiscus", 2).          modifier("clarified milk punch", 4).
modifier("chartreuse rinse", 3).  modifier("tomato water", 3).
tag("smoked maple", smoke). tag("rosemary smoke", smoke).
tag("hickory-smoked honey", smoke). tag("applewood smoke", smoke).
tag("lapsang souchong syrup", smoke).

vessel_opt("a mason jar", 1).          vessel_opt("a copper mug", 1).
vessel_opt("a vintage teacup", 2).     vessel_opt("an Erlenmeyer flask", 3).
vessel_opt("a mini milk bottle", 2).   vessel_opt("a terrarium", 4).
vessel_opt("a jam jar with a handle", 2).
vessel_opt("a hollowed-out heirloom tomato", 5).
vessel_opt("a hand-thrown ceramic skull", 4).
vessel_opt("a repurposed light bulb", 3).
vessel_opt("a beaker from a closed chemistry lab", 4).
vessel_opt("a coconut someone found", 3).
vessel_opt("a sake cup inside a smaller sake cup", 5).
vessel_opt("a Victorian coupe", 2).
vessel_opt("a deliberately dented tin cup", 3).
vessel_opt("a clay pot with a cork", 3).

drink_garnish("a dehydrated blood orange wheel", 2).
drink_garnish("a sprig of thyme", 1).
drink_garnish("a single clear ice sphere", 2).
drink_garnish("a torched cinnamon stick", 2).
drink_garnish("a tiny wooden clothespin", 3).
drink_garnish("a pickled ramp", 3).
drink_garnish("edible glitter", 3).
drink_garnish("a shard of honeycomb", 3).
drink_garnish("a smoking bay leaf", 3).
drink_garnish("a hand-carved ice obelisk", 4).
drink_garnish("an expressed grapefruit coin", 2).
drink_garnish("a brandied cherry on a bamboo pick", 2).
drink_garnish("a single cured egg yolk", 4).
drink_garnish("a vintage swizzle stick from a defunct hotel", 4).
drink_garnish("a curl of shaved bark", 3).
drink_garnish("a stamped ice cube bearing our logo", 3).

cocktail_name("The Gentrifier").   cocktail_name("Bushwick Sour").
cocktail_name("Gowanus Mule").     cocktail_name("L Train Delay").
cocktail_name("The Landlord").     cocktail_name("Fixed-Gear Fizz").
cocktail_name("The Lumbersexual"). cocktail_name("Second Kickstarter").
cocktail_name("Rent Is Due").      cocktail_name("Williamsburg Bridge").
cocktail_name("Artisanal Regret"). cocktail_name("The Sourdough Starter").
cocktail_name("Vinyl Only").       cocktail_name("The Co-Op Board").
cocktail_name("Gluten-Free Spirit"). cocktail_name("Pour-Over Old Fashioned").
cocktail_name("The Unpaid Intern"). cocktail_name("Handlebar Mustache").
cocktail_name("Before It Was Cool"). cocktail_name("The Thrift Store Coat").
cocktail_name("Bespoke Negroni"). cocktail_name("The Etsy Shop").
cocktail_name("Silent Reading Party"). cocktail_name("The Converted Warehouse").

% --- branding ---
name_noun("Anvil"). name_noun("Thistle"). name_noun("Hound"). name_noun("Larder").
name_noun("Ox").    name_noun("Lantern"). name_noun("Barrel"). name_noun("Wren").
name_noun("Plow").  name_noun("Gristle"). name_noun("Fern").   name_noun("Mule").
name_noun("Quill"). name_noun("Bramble"). name_noun("Cleaver"). name_noun("Heron").
name_noun("Sorrel"). name_noun("Tallow"). name_noun("Crow").   name_noun("Ledger").

name_suffix("Provisions"). name_suffix("Mercantile"). name_suffix("Supply Co.").
name_suffix("Dry Goods").  name_suffix("Social Club"). name_suffix("Victuals").
name_suffix("Public House"). name_suffix("General Store").
name_suffix("Tavern & Apothecary"). name_suffix("Canteen"). name_suffix("Feed & Seed").
name_suffix("Oyster Saloon"). name_suffix("Smokehouse & Reading Room").

neighborhood("Williamsburg"). neighborhood("Bushwick").  neighborhood("Greenpoint").
neighborhood("Park Slope").   neighborhood("Carroll Gardens"). neighborhood("Gowanus").
neighborhood("Red Hook").     neighborhood("Crown Heights").
neighborhood("Ridgewood").    neighborhood("Fort Greene"). neighborhood("Bed-Stuy").
neighborhood("Dumbo").        neighborhood("Clinton Hill").

year(2008..2016).

tagline_opt("All ingredients sourced within 40 miles of our reclaimed-wood bar.").
tagline_opt("Ask your server about our ramp program.").
tagline_opt("We pickle everything in-house. Everything.").
tagline_opt("Cash only. No substitutions. No photos of the bartender.").
tagline_opt("Our butcher has a podcast.").
tagline_opt("Plates are designed to be shared, and are very small.").
tagline_opt("Lit exclusively by Edison bulbs.").
tagline_opt("Our ice is hand-chipped by a former architect.").
tagline_opt("Please do not ask for a menu. You are holding it.").
tagline_opt("The playlist is vinyl. The vinyl is a concept.").
tagline_opt("Every table is a single slab of reclaimed bowling alley.").
tagline_opt("Our bartenders prefer the term \"liquid archivists.\"").
tagline_opt("Water is available upon written request.").
tagline_opt("A 22% gratitude fee has been added to support our foraging team.").
tagline_opt("Reservations open at 4:17 a.m. on the second Tuesday.").

% ---------------------------------------------------------------------
%  GENERATE
% ---------------------------------------------------------------------

dish(small, 1..n_small).
dish(large, 1..n_large).
drink(1..n_cocktails).

1 { main(S,N,I)    : ingredient(I,K,_), main_ok(S,K) } 1 :- dish(S,N).
1 { side(S,N,I)    : ingredient(I,K,_), side_ok(K)   } 2 :- dish(S,N).
1 { garnish(S,N,I) : ingredient(I,garnish,_)         } 1 :- dish(S,N).
1 { prep(S,N,P)    : preparation(P,_)                } 1 :- dish(S,N).

role(S,N,I,main)    :- main(S,N,I).
role(S,N,I,side)    :- side(S,N,I).
role(S,N,I,garnish) :- garnish(S,N,I).

1 { base(D,X)     : spirit(X,_)        } 1 :- drink(D).
1 { mod(D,M)      : modifier(M,_)      } 2 :- drink(D).
1 { vessel(D,V)   : vessel_opt(V,_)    } 1 :- drink(D).
1 { dgarnish(D,G) : drink_garnish(G,_) } 1 :- drink(D).
1 { cname(D,C)    : cocktail_name(C)   } 1 :- drink(D).

1 { bar_first(A)  : name_noun(A)    } 1.
1 { bar_second(B) : name_noun(B)    } 1.
1 { bar_suffix(X) : name_suffix(X)  } 1.
1 { located(H)    : neighborhood(H) } 1.
1 { est(Y)        : year(Y)         } 1.
2 { tagline(T)    : tagline_opt(T)  } 2.

% ---------------------------------------------------------------------
%  THE LAWS OF ARTISANAL DINING  (integrity constraints)
% ---------------------------------------------------------------------

% No ingredient appears twice anywhere on the menu.
:- ingredient(I,_,_), #count { S,N,R : role(S,N,I,R) } > 1.

% Every dish must contain at least one buzzword.
buzzy(S,N) :- role(S,N,I,_), tag(I,T), trendy(T).
:- dish(S,N), not buzzy(S,N).

% Ramps are mandatory.
:- not role(_,_,"ramps",_).

% Only one dish may be deconstructed (we're not animals).
:- #count { S,N : prep(S,N,"deconstructed") } > 1.

% Bar name is "<Noun> & <Noun>", two different nouns.
:- bar_first(A), bar_second(A).

% Every cocktail: its own spirit, its own vessel, its own name and garnish.
:- spirit(X,_),        #count { D : base(D,X)     } > 1.
:- vessel_opt(V,_),    #count { D : vessel(D,V)   } > 1.
:- cocktail_name(C),   #count { D : cname(D,C)    } > 1.
:- drink_garnish(G,_), #count { D : dgarnish(D,G) } > 1.
:- modifier(M,_),      #count { D : mod(D,M)      } > 1.

% At least one cocktail involves smoke.
smoky(D) :- mod(D,M), tag(M,smoke).
:- not smoky(_).

% ---------------------------------------------------------------------
%  PRICING  (pretension is priced in)
%  A dish's score is the pretension of everything on it plus its prep.
%  Small plates cost $8 + score, large plates $18 + score, cocktails $11 + score.
% ---------------------------------------------------------------------

% Every large plate costs more than every small plate:
% 8 + small score < 18 + large score, i.e. small score - large score < 10.
:- dish(small,A), dish(large,B),
   #sum { P,I,1 : role(small,A,I,_), ingredient(I,_,P) ;
          Q,p,1 : prep(small,A,Pr),  preparation(Pr,Q) ;
         -P,I,2 : role(large,B,I,_), ingredient(I,_,P) ;
         -Q,p,2 : prep(large,B,Pr),  preparation(Pr,Q) } >= 10.

% The pretension of each chosen thing, so prices can be read off the menu.
pv(I,P)  :- role(_,_,I,_), ingredient(I,_,P).
pv(Pr,Q) :- prep(_,_,Pr),  preparation(Pr,Q).
pv(X,P)  :- base(_,X),     spirit(X,P).
pv(M,P)  :- mod(_,M),      modifier(M,P).
pv(V,P)  :- vessel(_,V),   vessel_opt(V,P).
pv(G,P)  :- dgarnish(_,G), drink_garnish(G,P).

% Which buzzword each dish leans on, so the menu can show its work.
buzz(S,N,I,T) :- role(S,N,I,_), tag(I,T), trendy(T).

% ---------------------------------------------------------------------
#show buzz/4.
#show main/3. #show side/3. #show garnish/3. #show prep/3. #show pv/2.
#show base/2. #show mod/2. #show vessel/2. #show dgarnish/2. #show cname/2.
#show bar_first/1. #show bar_second/1. #show bar_suffix/1. #show located/1. #show est/1.
#show tagline/1.
