% Block Party Whodunit
% Every neighbor spent the whole afternoon in one spot and brought one dish.
% No two neighbors shared a spot, and no two brought the same dish.
1 { at(P,L) : place(L) } 1 :- person(P).
:- at(P,L), at(Q,L), P < Q.
1 { brought(P,D) : dish(D) } 1 :- person(P).
:- brought(P,D), brought(Q,D), P < Q.

% Whoever was at the scene took it.
culprit(P) :- at(P,L), scene(L).

% What each kind of clue means: a clue rules out every world that breaks it.
:- clue(_, at(P,L)),              not at(P,L).
:- clue(_, not_at(P,L)),          at(P,L).
:- clue(_, brought(P,D)),         not brought(P,D).
:- clue(_, not_brought(P,D)),     brought(P,D).
:- clue(_, dish_at(D,L)),         brought(P,D), not at(P,L).
:- clue(_, dish_not_at(D,L)),     brought(P,D), at(P,L).
:- clue(_, either(P,Q,L)),        not at(P,L), not at(Q,L).
:- clue(_, brought_either(P,D,E)), not brought(P,D), not brought(P,E).

#show culprit/1.
