TODO/GAPS/SUGGESTIONS

No way for event submitters to edit or follow up on their submission (eg what if there's a time or room change?)
No way for admins (or normal peeps) to cancel events (it should show cancelled instead of deleted so peeps know)

No email notifications — admins won't know when something is pending approval unless they log in and check
Mobile navbar — it'll break on small screens with all those buttons in a row


in the log in page, if people arent admins/etc maybe they could request to be an admin (providing an email and password)
also clarify that only admins can log in so peeps arent wondering why there isnt a sign up button

email announcements?

integrate with socials!!

when adding events:
- when their event is approved, they receive an email if they've put one in
- optionally add an image (but think db memory)

event queue for admins:
- when an event is approved, also publish that event to socials? or email announcements?
- different types of admin requests - "New recurring event request", "Cancel Event Request", "Event edit Request"

add predetermined events eg easter sunday, christmas day
maybe have this a kind of special event / non real event as it doesnt require a location or booking info etc

when you filter you can filter by event by range, region, etc


need better filtering/search options

must have a region selected?


accessibility review - send directly to their email


people can click I'm going to a certain event - maybe need to wait until after user accounts are set up

means can filter for city/region etc

add admin view; can see who are the other admins and for which region are they in charge of


ai summariser of info from website url

scrape data for events.
eg theatre websites for their bsl interpreted event info



Recommended Next Steps
High Impact, Relatively Quick
These would make the biggest visible difference to a first-time visitor:

SEO & social sharing metadata — Add per-page <title> tags and Open Graph tags so event links look good when shared on WhatsApp/social media. Currently sharing a link just shows a blank preview. This is pure frontend work.

Medium Impact, More Involved
Event submission feedback loop — A confirmation email to event submitters (via a Supabase Edge Function) and an email to admins when a new submission arrives. Currently both sides are flying blind. This is probably the biggest friction point for event organisers.

Event images — Even a simple category-based placeholder system would improve the visual experience significantly before committing to full image uploads.


1.

a lot of the themes on dark modes just turn black at the bottom end, rather than a different colour or more intense shade of the colour etc. review these.
Also in the calendar view on desktop, the panel on the right hand side doesnt have a gradient? it's still technically a background. Same for the left panel of the map view on desktop.
Hell, could even apply a gradient to some of the cards, such as filters and event details page, or even a sight gradient to the calendar itself. What do you think?



2.
I feel like a lot of the themes, such as rose on dark mode, doesn't offer much contrast between the cards and the background (esp in list view) and they can start to feel a bit 'much'.
Go through them all and give feedback on whether people will like them or not.


3.
MCP:
https://github.com/modelcontextprotocol/servers/tree/HEAD/src/sequentialthinking

https://github.com/obra/superpowers 

4.
When I click on recurring event in submit event, theres a black rectangle border. I don't like this.
In addition, the recurring section/box css is not consistent with the rest of the page/site. the font is different, it looks rectangular and funky


5.
Go through all the css etc, and think about how to improve the entire user experience as a whole.
think visibility, consistency, interactions.

add more awesome css stuff, have a look at this website for some stuff you could use:
https://prismic.io/blog/css-animation-examples

You could also use Tailwind CSS / Framer Motion / React Spring / GSAP / Lenis / CSS backdrop-filter / react-use-gesture / clsx / AOS (Animate On Scroll) / FullCalendar React !!

Research into each of these and which we should use and where, what are the benefits of incorporating these into our websites and if we should.

Animate BSL icon with a subtle wave 👋 (and other things if you want)

But don't turn it into a fireworks show.
Pick:
2 animation styles
1 signature interaction
1 “wow” moment
Repeat them consistently → that’s what makes it feel professional.


