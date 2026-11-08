% Optional: load alongside menu.lp to find the most pretentious menu possible.
% Total pretension = every chosen ingredient, prep, spirit, modifier, vessel and garnish.
#maximize { P,I,ing : role(_,_,I,_), ingredient(I,_,P) ;
            Q,S,N,prep : prep(S,N,Pr), preparation(Pr,Q) ;
            P,D,spirit : base(D,X), spirit(X,P) ;
            P,M,mod : mod(_,M), modifier(M,P) ;
            P,V,vessel : vessel(_,V), vessel_opt(V,P) ;
            P,G,dgarnish : dgarnish(_,G), drink_garnish(G,P) }.
