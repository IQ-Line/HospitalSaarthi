Notes by dev to claude code

## After reviewing

1. Regarding AuthN while reading I suddenly had a doubt whether better-auth would be best in case it has limited support for Federation adapters (I'm unfamiliar with these concepts as well). I would like us to verify from docs to what extent this is true and also how easy are they to build/maintain considering today's modern open source ecosystem but also realistic considerations as well. One of the co-leads had cursorily looked up cerbos and said it's a paid service. Wanted to know if this is true, as this may change the picture entirely. I wanted us to deeply research online so we're super sure.

2. In considered options of authz cerbos I'd like to also add consideration poitns for hand-rolling and ALSO for Keycloak. I want to basically be able to frame strong, evidence based arguments (via example flows/diagrams as well in P3 perhaps) for why their theoretical implementations would not be optimal to do. Actually, this may apply to a lot of other considerations, but for now we'll focus on this.

3. In fhir hl7 I sort of had a doubt, perhaps LLD wise even or even HLD wise even but does it make sense that the conversion to FHIR could be abstracted away to a good enough extent (they just have to pass data into a well typed and annotated function) so it doesn't become much (or at all) of an operational burden? Additionally does it make sense of modules to communicate amongst eachother primarily via FHIR and the outbound integration service part to have its own FHIR to HL7v2 converter/adaptor just so, operations wise, it's even more easier to maintain and clearer? Let me know if this was already considered/proposed in the doc or whether this is a bad idea.

4. Regarding integration-hub-split, I wanted to know if our implementation would implement the state-machine driven worfklow like pattern. Earlier before I knew this project would come along I'd researched a bit on how best to integrate with ABDM like services that are based on multi-turn webhooks and all, and I'd arrived at the idea of a finite-state-machine (temporal and all that). Please consider this, if not.

## Plus other stuff before/during reviewing

These were more from a preliminary new meeting with EM and other co-lead, and wanted to mention their points/concerns (they hadn't yet seen our in-progress-design) but wanted to know if their points are considered:

1. How nested would Cerbos allow authorization of? Like, could it help configure fine-grained auth like "user can access this module's sub-module's feature's sub-feature but only for read/write/delete etc scope" level of depth (like, what level of nesting is possible? I myself am not too familiar with the policy, principle, etc thing yet and will learn). Although we'd only consider realistic scenarios, we must have a highgly flexible/configurable implementation because for the wide variety of hospitals we support we dont know what insane (but real world) requirements may come. In the AuthZ adr you mentioned regos has deeper support. I wanted to consider it a bit deeper as well, considering a flow/potential implementation (maybe in the P3 we can also diagram potential alternatives just to show we deeply considered this or that and also have a more solid argument for why NOT to take it?).  I wanted to mention AuthZ would be maybe the most scrutinized of the core modules.

2. Regarding AuthZ, would it be seamless to allow multiple roles to a user?

3. The EM mentioned that module-specific-entities would be owned by the master data service, I didn't fully understand that. Wanted to know if you understood and whether or not we'd be covering whatever this is.

4. To what extent could our design support organizations having hospitals with sub-hospitals and further deeper level nesting/heirarchy? To be fair, from product-side, we don't know to what extent such nesting could be, and I'd even mentioned that maybe each branch and node of this heirarchy thing could be its own tenant, thus data wise it'd still be one level, it's just that there's another structure/way to consider heirarchy. Although, was also kind of wondering how our structure addresses (or, if not addresses, but cleanly allows) multiple pharmacy's per tenant or scenarios like that. Wanted to know your thoughts on the same.

5. How would the frontend work with AuthZ basically, there would need to be some way to parse and store what the user can and cannot see/access/do on the frontend in dx friendly way. Maybe with cerbos such a thing exists but if not I dont mind us inventing ones

6. As they dont typically do a lot of research-and-implement kind of thing, I wanted to make a very strong case for WHY that's a good idea to do this, I also specifically wanted to make the point that "the best way to decide what to implement is to have looked up how similar products/companies etc online have documented how they solved this/that". We do link to articles and books already and they do a good part of this job but rather than just linking to theory, me being able to point out concrete recognizable/relatable examples (like if XYZ company did this or that or wrote about it or ABC authoritative sources had these case studies) would make my points significantly stronger.

7. Something to revisit in the near future but we may map out and walk through some more concrete real flows and maybe even make some mini POCs for this or that flow, though I'll let you know what ones later. But this may be the strongest arguments we may have.

8. May potentially soften the argument for EMPI being a "core module" but wont discard it entirely just yet. (Push back on this if you're very sure)

9. Wanted to make a decision of whether a user belongs to just one tenant or just one organization or can be assigned tenants/organizations. This is very slightly a product-thing to decide as well, but wanted to note down a solid list of pros-cons and diagram examples of having each tenant have their own slug/subdomain so a user logs in to one tenant or having a single url and it's a complete SAAS like thing where they can change tenants/organizations and all that, the way Slack works or something else. This may even help product decide.

10. Remind me later or note this down somewhere so we dont forget, but after all is said and done (all the original plans the original handoff specified) I'd like to have a step of the plan where we just note down the constraints/problem/details etc we had to work with. This gives us an easy way to provide other leads info to independently arrive at their own solutions, so we can actually compare. 