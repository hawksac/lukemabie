% garden.lp  -  three-season square-foot garden planner
% Facts supplied by the page:
%   cell(X,Y)        1 ft squares, Y = 1 is the north edge
%   sun(X,Y,N)       3 full sun, 2 part sun, 1 shade
%   crop(P)  family(P,F)  needs(P,N)  grows(P,S)  spread(P,K)
%   tall(P)  feeder(P,heavy|light|fixer)  want(P,N)
%   good(P,Q)  bad(P,Q)   companion pairs, either order
%   fill.            present when open squares should be planted

season(1..3).                       % 1 spring, 2 summer, 3 fall

% --- Choice: at most one crop per square per season --------------
{ at(X,Y,S,P) : crop(P), grows(P,S) } 1 :- cell(X,Y), season(S).

% --- Geometry: Chebyshev distance (up to 3) between squares -------
dist(X1,Y1,X2,Y2,D) :- cell(X1,Y1), cell(X2,Y2), (X1,Y1) < (X2,Y2),
                       D = |X1-X2|, |X1-X2| >= |Y1-Y2|, D <= 3.
dist(X1,Y1,X2,Y2,D) :- cell(X1,Y1), cell(X2,Y2), (X1,Y1) < (X2,Y2),
                       D = |Y1-Y2|, |Y1-Y2| >  |X1-X2|, D <= 3.
adj(X1,Y1,X2,Y2) :- dist(X1,Y1,X2,Y2,1).

good(Q,P) :- good(P,Q).
bad(Q,P)  :- bad(P,Q).

% --- Sun: tall crops shade the square to their north -------------
shaded(X,Y,S) :- cell(X,Y), at(X,Y+1,S,P), tall(P).
light(X,Y,S,N)   :- sun(X,Y,N), season(S), not shaded(X,Y,S).
light(X,Y,S,N-1) :- sun(X,Y,N), shaded(X,Y,S), N > 1.
light(X,Y,S,1)   :- sun(X,Y,1), shaded(X,Y,S).
:- at(X,Y,S,P), needs(P,N), light(X,Y,S,L), L < N.

% --- Companions: bad pairs are never neighbors -------------------
:- at(X1,Y1,S,P), at(X2,Y2,S,Q), adj(X1,Y1,X2,Y2), bad(P,Q).

% --- Spacing: sprawlers with spreads A and B stay A+B apart ------
crowd(P,Q,D) :- spread(P,A), spread(Q,B), A > 0, B > 0,
                D = 1..3, D < A+B.
:- at(X1,Y1,S,P), at(X2,Y2,S,Q), dist(X1,Y1,X2,Y2,D), crowd(P,Q,D).

% --- Rotation: a family never follows itself in a square ---------
:- at(X,Y,S,P), at(X,Y,S+1,Q), family(P,F), family(Q,F).

% --- Wishlist shortfall -------------------------------------------
have(P,C)    :- want(P,_), C = #count{ X,Y,S : at(X,Y,S,P) }.
short(P,N-C) :- want(P,N), have(P,C), C < N.

% --- Goals, highest priority first --------------------------------
#minimize { K@3,P : short(P,K) }.
#maximize { 1@2,X1,Y1,X2,Y2,S : at(X1,Y1,S,P), at(X2,Y2,S,Q),
                                adj(X1,Y1,X2,Y2), good(P,Q) }.
#maximize { 1@2,X,Y,S,rotation : at(X,Y,S,P), feeder(P,heavy),
                                 at(X,Y,S+1,Q), feeder(Q,fixer) }.
#maximize { 1@1,X,Y,S : at(X,Y,S,_), fill }.

#show at/4.
#show shaded/3.
#show short/2.
