// Question bank: a big pool for each level, about its Zebonky's two animals,
// its real-world biome, and a little Zebonkia lore. When a mystery crate
// opens, the quiz draws one at random with drawQuestion(); a level run never
// repeats a question, and the pool only starts over once every question in
// it has been seen.
//
// Each question: q, answers (the first is the correct one; the quiz shuffles
// them), hint (a nudge that doesn't give the answer away) and fact (shown
// after a right answer). Every fact here needs a source check before launch.
//
// Who lives where: Dorsal Cove, Shaan (shark + armadillo). Cumulus
// Rainforest, Charlie (chimpanzee + cheetah). Seafoam Shores, Axel (axolotl +
// otter). Bamboo Dunes, Ricky (raccoon + cockatoo). Squvannahs, Sofia
// (squirrel + buffalo). Magenta Mountains, Unity (unicorn + scorpion).

// This is the Explorer bank. Junior Explorer and Pioneer have their own
// (questions_junior.js, questions_pioneer.js), copies of this one for now.
import { JUNIOR_QUESTIONS } from './questions_junior.js?v=8a35cc4';
import { PIONEER_QUESTIONS } from './questions_pioneer.js?v=8a35cc4';
import dorsalJunior from './questions/dorsal_junior.js?v=8a35cc4';
import dorsalExplorer from './questions/dorsal_explorer.js?v=8a35cc4';
import dorsalPioneer from './questions/dorsal_pioneer.js?v=8a35cc4';
import cumulusJunior from './questions/cumulus_junior.js?v=8a35cc4';
import cumulusExplorer from './questions/cumulus_explorer.js?v=8a35cc4';
import cumulusPioneer from './questions/cumulus_pioneer.js?v=8a35cc4';
import squvannahsJunior from './questions/squvannahs_junior.js?v=8a35cc4';
import squvannahsExplorer from './questions/squvannahs_explorer.js?v=8a35cc4';
import squvannahsPioneer from './questions/squvannahs_pioneer.js?v=8a35cc4';
import seafoamJunior from './questions/seafoam_junior.js?v=8a35cc4';
import seafoamExplorer from './questions/seafoam_explorer.js?v=8a35cc4';
import seafoamPioneer from './questions/seafoam_pioneer.js?v=8a35cc4';
import magentaJunior from './questions/magenta_junior.js?v=8a35cc4';
import magentaExplorer from './questions/magenta_explorer.js?v=8a35cc4';
import magentaPioneer from './questions/magenta_pioneer.js?v=8a35cc4';

export const QUESTIONS = {
  dorsal: [
    {
      q: "Shaan is part shark. What is a shark's skeleton made of?",
      answers: ['Cartilage', 'Bone', 'Wood', 'Seashells'],
      hint: 'Squeeze the tip of your nose. That bendy stuff is the answer.',
      fact: 'Cartilage is the bendy stuff in your nose and ears!',
    },
    {
      q: 'Shaan is part armadillo. How does a three-banded armadillo stay safe?',
      answers: ['It rolls into a ball', 'It climbs a tall tree', 'It changes color', 'It sprays ink'],
      hint: 'It curls up tight, like a pill bug.',
      fact: 'Its hard shell closes up like an armored ball.',
    },
    {
      q: 'Sharks grow new ones of these their whole lives. What are they?',
      answers: ['Teeth', 'Fins', 'Tails', 'Eyes'],
      hint: 'Kids lose these too, but sharks lose thousands.',
      fact: 'When a shark loses a tooth, a new one moves up to take its place.',
    },
    {
      q: 'How can a shark find food that is far away?',
      answers: ['It smells it in the water', 'It hears music', 'It sees through rocks', 'It feels the wind'],
      hint: 'Which sense uses your nose?',
      fact: 'Sharks can smell tiny amounts of food from far across the water.',
    },
    {
      q: 'Shaan is part armadillo. What do armadillos mostly eat?',
      answers: ['Insects like ants and beetles', 'Fish', 'Seaweed', 'Seashells'],
      hint: 'A long sticky tongue is perfect for tiny crawly things.',
      fact: 'A long sticky tongue helps an armadillo slurp up bugs.',
    },
    {
      q: 'What is the biggest fish in the whole ocean?',
      answers: ['The whale shark', 'The great white shark', 'The tuna', 'The goldfish'],
      hint: "It's a shark, named after an even bigger animal.",
      fact: 'A whale shark can be as long as a school bus, but it eats tiny plankton.',
    },
    {
      q: "Rub a shark's skin the wrong way. What does it feel like?",
      answers: ['Sandpaper', 'Silk', 'Jelly', 'Feathers'],
      hint: 'It is rough and scratchy.',
      fact: 'Shark skin is covered in tiny tooth-like scales called denticles.',
    },
    {
      q: "A hammerhead shark's head is shaped like a...",
      answers: ['Hammer', 'Star', 'Spoon', 'Circle'],
      hint: 'Its name tells you!',
      fact: 'Its eyes sit far apart, so it can see almost all the way around.',
    },
    {
      q: 'How does a nine-banded armadillo sometimes cross a small stream?',
      answers: ['It walks along the bottom', 'It rides a turtle', 'It builds a bridge', 'It waits for winter'],
      hint: 'It can hold its breath for a few minutes.',
      fact: 'It can also gulp air to puff itself up and float across.',
    },
    {
      q: 'A nine-banded armadillo mom usually has how many babies at once?',
      answers: ['Four', 'One', 'Twenty', 'Two hundred'],
      hint: 'Count the legs on a chair.',
      fact: 'The four babies are identical, all boys or all girls!',
    },
    {
      q: 'Armadillos have strong, curved claws. What are they best for?',
      answers: ['Digging', 'Swimming', 'Climbing glass', 'Painting'],
      hint: 'Armadillos make burrows under the ground.',
      fact: 'An armadillo can dig a burrow very fast to escape danger.',
    },
    {
      q: 'Many sharks need to keep doing what so they can breathe?',
      answers: ['Swimming', 'Singing', 'Sleeping', 'Eating'],
      hint: 'Water has to keep rushing over their gills.',
      fact: 'Moving water carries oxygen across their gills.',
    },
    {
      q: 'What is a baby shark called?',
      answers: ['A pup', 'A kitten', 'A calf', 'A chick'],
      hint: 'Same name as a baby dog.',
      fact: 'Shark pups can swim and look after themselves right away.',
    },
    {
      q: 'Sharks have tiny spots on their snouts that can sense...',
      answers: ['Electricity from living animals', 'Rainbows', 'Music', 'Snowflakes'],
      hint: 'Every heartbeat makes a tiny spark.',
      fact: 'That helps sharks find fish hiding under the sand.',
    },
    {
      q: "What mostly makes the ocean's tides go in and out?",
      answers: ['The Moon', 'The wind', 'Whales', 'Boats'],
      hint: 'Look up at the night sky.',
      fact: "The Moon's pull makes most beaches get two high tides a day.",
    },
    {
      q: "Dorsal Cove's waterfall is special. Which way does it flow?",
      answers: ['Uphill', 'Downhill', 'Sideways', 'In circles'],
      hint: 'Zebonkia is a strange place, and this waterfall breaks the rules.',
      fact: 'It runs up the cliffs and into the Cumulus Rainforest.',
    },
    {
      q: 'What shape is the rock on top of the waterfall in Dorsal Cove?',
      answers: ['A shark fin', 'A star', 'A crown', 'A heart'],
      hint: "Think about who lives in the cove.",
      fact: 'The fin-shaped rock gives Dorsal Cove its name.',
    },
    {
      q: "The fin on top of a shark's back is called the...",
      answers: ['Dorsal fin', 'Top hat', 'Back flap', 'Sail'],
      hint: 'Look at the name of this level!',
      fact: 'The dorsal fin keeps a shark from rolling over as it swims.',
    },
    {
      q: 'Most beach sand is made of...',
      answers: ['Tiny bits of rock and shell', 'Sugar', 'Salt', 'Glitter'],
      hint: 'Waves grind big things down very, very small.',
      fact: 'Some beaches have pink, black or even green sand!',
    },
    {
      q: 'How do most crabs walk?',
      answers: ['Sideways', 'On their heads', 'Only backwards', 'Hopping'],
      hint: 'Watch one scuttle across the sand.',
      fact: "A crab's legs bend best to the side, so sideways is fastest.",
    },
    {
      q: "Why shouldn't people drink seawater?",
      answers: ["It's much too salty", "It's too cold", "It's too blue", "It's too wet"],
      hint: 'Taste a tear. The ocean is far more of that.',
      fact: 'Salty water makes your body thirstier, not less thirsty.',
    },
    {
      q: 'How many arms do most sea stars have?',
      answers: ['Five', 'Two', 'Ten', 'One hundred'],
      hint: 'Count the fingers on one hand.',
      fact: 'A sea star can grow back an arm it has lost.',
    },
    {
      q: 'What slowly carves caves into cliffs along the coast?',
      answers: ['Waves', 'Snails', 'Wind chimes', 'Rainbows'],
      hint: 'Crash, crash, crash, for thousands of years.',
      fact: 'Sea caves can take thousands of years to form.',
    },
    {
      q: "What is an armadillo's shell made of?",
      answers: ['Bony plates', 'Wood', 'Glass', 'Feathers'],
      hint: 'Like your bones, but on the outside.',
      fact: 'The bands in the middle bend so the armadillo can move.',
    },
    {
      q: "Armadillos can't see very well. How do they find bugs?",
      answers: ['With their strong noses', 'With a flashlight', 'By listening to music', 'By asking birds'],
      hint: 'Sniff, sniff!',
      fact: 'Armadillos can smell insects hiding under the dirt.',
    },
    {
      q: 'What helps ships find their way past rocky cliffs at night?',
      answers: ['A lighthouse', 'A treehouse', 'A doghouse', 'A birdhouse'],
      hint: 'A tall tower with a bright light on top.',
      fact: 'Each lighthouse flashes its own pattern so sailors know which one it is.',
    },
    {
      q: 'Where does a hermit crab live?',
      answers: ['In a shell it finds', 'In a nest', 'In a tree', 'Inside a bubble'],
      hint: 'When it grows, it moves house.',
      fact: 'Hermit crabs trade up to bigger shells as they grow.',
    },
    {
      q: 'Shaan goes with the flow and acts on...',
      answers: ['Instinct', 'A map', 'A timer', 'A shopping list'],
      hint: 'A gut feeling, not a plan.',
      fact: 'Real sharks hunt on instinct too.',
    },
    {
      q: 'Which shark is famous for its huge size and pointy teeth?',
      answers: ['The great white', 'The tiger lily', 'The goldfish', 'The jellyfish'],
      hint: 'Its name is a color.',
      fact: 'Great whites can sense a single drop of blood in lots of water.',
    },
    {
      q: 'Do sharks have bones in their fins?',
      answers: ['No', 'Yes, lots', 'Only big sharks', 'Only on Tuesdays'],
      hint: 'Remember what a shark skeleton is made of.',
      fact: 'Shark fins are held up by cartilage and stiff fibers.',
    },
  ],

  cumulus: [
    {
      q: 'Charlie is part cheetah. What is the fastest land animal in the world?',
      answers: ['The cheetah', 'The lion', 'The horse', 'The ostrich'],
      hint: "Charlie's spotted half is a speedster.",
      fact: 'A cheetah can go from standing still to top speed in just a few seconds.',
    },
    {
      q: 'Charlie is part chimpanzee. How do chimps get termites out of a mound?',
      answers: ['They poke in a stick', 'They pour in water', 'They wait for rain', 'They blow on it'],
      hint: 'Like a fishing pole, but for bugs.',
      fact: 'Chimps use sticks as tools, just like a fishing pole!',
    },
    {
      q: "What does a cheetah's long tail help it do while running?",
      answers: ['Turn and balance', 'Swim', 'Climb ropes', 'Dig holes'],
      hint: 'It works like the rudder on a boat.',
      fact: 'The tail helps a cheetah make sharp turns at top speed.',
    },
    {
      q: "Charlie is part cheetah. What runs from a cheetah's eyes down to its mouth?",
      answers: ['Black tear marks', 'Blue stripes', 'White spots', 'Nothing at all'],
      hint: 'They look like lines of tears.',
      fact: 'Those dark tear marks may help cut down the glare of the sun.',
    },
    {
      q: 'Where do chimpanzees build their beds at night?',
      answers: ['Up in the trees', 'In caves', 'Under water', 'In the sand'],
      hint: 'Way off the ground, safe from danger.',
      fact: 'Chimps weave a fresh nest of leaves and branches every night.',
    },
    {
      q: 'What do we call the top layer of leaves in a rainforest?',
      answers: ['The canopy', 'The basement', 'The floor', 'The roots'],
      hint: 'It spreads out like a big leafy umbrella.',
      fact: 'Lots of rainforest animals live up in the canopy and almost never come down.',
    },
    {
      q: 'Rainforests get lots and lots of what?',
      answers: ['Rain', 'Snow', 'Sand', 'Ice'],
      hint: "It's right there in the name.",
      fact: 'Some rainforests get rain almost every single day.',
    },
    {
      q: 'Chimpanzees are one of the closest animal relatives of...',
      answers: ['People', 'Frogs', 'Parrots', 'Spiders'],
      hint: 'Look in a mirror.',
      fact: 'Chimps and people share almost 99 out of every 100 parts of their DNA.',
    },
    {
      q: 'A group of chimpanzees living together is called a...',
      answers: ['Troop', 'School', 'Swarm', 'Pod'],
      hint: 'Scouts and soldiers can be in one too.',
      fact: 'A chimp troop can have dozens of members.',
    },
    {
      q: "Most cats can hide their claws. What can't a cheetah fully pull in?",
      answers: ['Its claws', 'Its ears', 'Its tail', 'Its whiskers'],
      hint: 'Runners wear spiky shoes for grip. Cheetahs have these.',
      fact: "A cheetah's claws grip the ground like a sprinter's spikes.",
    },
    {
      q: "What do a cheetah's spots look like?",
      answers: ['Solid black dots', 'Stripes', 'Squares', 'Stars'],
      hint: 'Simple round dots, filled in all the way.',
      fact: 'Leopards have rings called rosettes, but cheetahs have solid spots.',
    },
    {
      q: 'What do chimpanzees eat most?',
      answers: ['Fruit', 'Rocks', 'Seaweed', 'Snow'],
      hint: 'Sweet things that grow on trees.',
      fact: 'Chimps also eat leaves, seeds, insects and sometimes meat.',
    },
    {
      q: 'When do cheetahs usually hunt?',
      answers: ['In the daytime', 'At midnight', 'Underwater', 'In the snow'],
      hint: 'They need good light to spot what they are chasing.',
      fact: 'Hunting by day keeps cheetahs away from lions, which hunt at night.',
    },
    {
      q: 'About how fast can a cheetah run?',
      answers: ['As fast as a car on the highway', 'As fast as a snail', 'As fast as a jet plane', 'As fast as a skateboard'],
      hint: 'Faster than any other land animal, but not as fast as a plane.',
      fact: 'About 70 miles (110 km) an hour, but only for a short sprint.',
    },
    {
      q: "Why do chimps pick through each other's fur?",
      answers: ['To clean it and make friends', 'To find treasure', 'To make it curly', 'To count the hairs'],
      hint: "It's a bit like a hug and a bath at once.",
      fact: 'This is called grooming, and it keeps a troop close.',
    },
    {
      q: 'Does a chimpanzee have a tail?',
      answers: ['No, chimps are apes', 'Yes, a long one', 'Yes, two', 'Only the babies'],
      hint: 'Apes and monkeys are different in one big way.',
      fact: 'Monkeys have tails and apes do not. Charlie has one from his cheetah side!',
    },
    {
      q: 'Why does only a little sunlight reach the rainforest floor?',
      answers: ['The leaves above block it', "It's always night there", 'The ground is black', 'Clouds live there'],
      hint: 'Look up. What is in the way?',
      fact: 'Plants on the dark forest floor often have giant leaves to catch light.',
    },
    {
      q: 'Which slow animal hangs upside down in rainforest trees?',
      answers: ['A sloth', 'A penguin', 'A camel', 'A crab'],
      hint: 'It moves very, very slowly.',
      fact: 'Sloths move so slowly that tiny green plants grow in their fur.',
    },
    {
      q: "About how many of the world's kinds of land plants and animals live in rainforests?",
      answers: ['About half', 'None', 'Just one', 'All of them'],
      hint: 'A lot, but not every single one.',
      fact: 'Rainforests cover a small part of Earth but are packed with life.',
    },
    {
      q: 'Some rainforest frogs are bright red, blue or yellow. What does that mean?',
      answers: ["Danger, don't eat me!", "Let's be friends", "I'm sleepy", "I'm tasty"],
      hint: 'Bright colors can be a warning sign.',
      fact: 'Poison dart frogs warn hungry animals with their bright colors.',
    },
    {
      q: "A toucan's huge, colorful beak helps it...",
      answers: ['Reach fruit and cool off', 'Swim', 'Dig tunnels', 'Carry babies'],
      hint: 'Think about food on thin branches, and a hot day.',
      fact: "A toucan's beak is light and helps it let out extra heat.",
    },
    {
      q: 'In Zebonkia, what do Cumulus trees look like?',
      answers: ['Clouds', 'Candy canes', 'Rocks', 'Seashells'],
      hint: 'Cumulus is a kind of puffy cloud.',
      fact: 'Cumulus trees have no trunks at all!',
    },
    {
      q: 'What happens to Cumulus tree leaves in a storm?',
      answers: ['They swell into waterproof canopies', 'They fall off', 'They turn to ice', 'They sing'],
      hint: 'Everyone in the forest needs to stay dry somehow.',
      fact: 'The swollen leaves make giant umbrellas over the rainforest.',
    },
    {
      q: 'What does a cumulus cloud look like?',
      answers: ['Big and puffy, like cotton balls', 'Thin and wispy', 'A flat gray blanket', 'Made of ice cubes'],
      hint: 'The fluffy kind you draw as a kid.',
      fact: 'Cumulus clouds usually mean nice weather, unless they grow very tall.',
    },
    {
      q: 'Charlie is the...',
      answers: ['Leader of the pack', 'Baby of the pack', 'Cook', 'Mail carrier'],
      hint: 'The others follow him.',
      fact: 'Charlie is part chimpanzee and part cheetah, and he leads the Zebonkies.',
    },
    {
      q: "Where is Charlie's favorite stargazing spot?",
      answers: ['Bamboo Dunes', 'Under the sea', 'Inside a volcano', 'In a cave'],
      hint: 'Far from the trees, with wide open skies.',
      fact: 'With no trees in the way, the desert sky is full of stars.',
    },
    {
      q: 'Besides sticks, what tool do some chimps use to crack nuts?',
      answers: ['A rock, like a hammer', 'A spoon', 'A shell phone', 'A feather'],
      hint: 'Something hard and heavy.',
      fact: 'Young chimps learn to crack nuts by watching the grown-ups.',
    },
    {
      q: 'Cheetahs have big nostrils and big lungs. That helps them...',
      answers: ['Breathe in lots of air while running', 'Smell flowers', 'Sneeze loudly', 'Whistle'],
      hint: 'Sprinting makes you huff and puff.',
      fact: 'More air means more energy for a burst of speed.',
    },
    {
      q: 'What are the long, rope-like plants that hang from rainforest trees?',
      answers: ['Vines', 'Icicles', 'Wires', 'Noodles'],
      hint: 'Jungle swingers grab these.',
      fact: 'Some rainforest vines climb all the way up to the canopy.',
    },
    {
      q: 'Do chimpanzees laugh when they play?',
      answers: ['Yes', 'No', 'Only at night', 'Only underwater'],
      hint: 'They love tickle games too.',
      fact: 'Chimp laughter sounds like breathy panting.',
    },
  ],

  seafoam: [
    {
      q: 'Axel is part axolotl. What amazing thing can an axolotl do?',
      answers: ['Regrow a lost leg', 'Fly short distances', 'Hibernate in snow', 'Live in a desert'],
      hint: 'If it gets hurt, it can grow a part back.',
      fact: 'Axolotls can regrow legs, tails, and even parts of their heart!',
    },
    {
      q: "Axel is part otter. What do sea otters sometimes do so they don't drift apart while they sleep?",
      answers: ['Hold paws', 'Sleep standing up on land', 'Bury themselves in sand', 'Hang upside down'],
      hint: "It's the same thing you do crossing a busy street.",
      fact: 'Floating together while holding paws keeps the group close.',
    },
    {
      q: 'Axolotls have feathery gills for breathing underwater. Where are they?',
      answers: ['On the sides of its head', 'On its tail', 'On its belly', 'Inside its toes'],
      hint: 'Look at the frilly bits on Axel.',
      fact: 'Those frilly gills make axolotls look like they are smiling.',
    },
    {
      q: 'Axel is part sea otter. Sea otters have the thickest what of any animal?',
      answers: ['Fur', 'Shell', 'Scales', 'Feathers'],
      hint: 'Soft, fuzzy and very warm.',
      fact: 'Thick fur keeps sea otters warm in cold water.',
    },
    {
      q: 'What do sea otters use to crack open shellfish?',
      answers: ['A rock', 'A stick', 'A fork', 'Their tail'],
      hint: 'Something hard they find on the sea floor.',
      fact: 'They float on their backs and bang shells on a rock on their tummy.',
    },
    {
      q: 'Unlike most salamanders, axolotls...',
      answers: ['Stay in the water their whole lives', 'Live in trees', 'Can fly', 'Live in the desert'],
      hint: 'They never really grow up and move onto land.',
      fact: 'Axolotls keep their baby gills all their lives.',
    },
    {
      q: 'What kind of animal is an axolotl?',
      answers: ['A salamander', 'A fish', 'A lizard', 'A crab'],
      hint: "It's an amphibian, a cousin of frogs and newts.",
      fact: 'People call it the Mexican walking fish, but it isn\'t a fish at all.',
    },
    {
      q: 'What color are most wild axolotls?',
      answers: ['Dark brown or greenish', 'Bright pink', 'Blue with stripes', 'Shiny gold'],
      hint: 'Colors that blend in with a muddy lake bottom.',
      fact: 'The pink ones you see are mostly pets.',
    },
    {
      q: 'Wild axolotls are...',
      answers: ['Very rare', 'Everywhere', 'Only on the moon', 'As common as ants'],
      hint: 'They only live in a few lakes and canals.',
      fact: 'People are working to clean their lakes so they can thrive again.',
    },
    {
      q: 'Sea otters have a pouch of loose skin under each arm. What goes in it?',
      answers: ['Food and a favorite rock', 'Their babies', 'Seaweed hats', 'Water'],
      hint: 'Like a lunchbox and a toolbox in one.',
      fact: 'Some otters keep the same favorite rock for a long time.',
    },
    {
      q: 'Which of these do sea otters love to eat?',
      answers: ['Sea urchins and crabs', 'Grass', 'Bananas', 'Bread'],
      hint: 'Spiky and crunchy things from the sea floor.',
      fact: 'Eating sea urchins helps kelp forests grow.',
    },
    {
      q: 'Why do sea otters spend so much time grooming their fur?',
      answers: ['To keep it fluffy and warm', 'To look fancy', 'To dry off', 'To find snacks'],
      hint: 'Sea otters have no blubber like seals do.',
      fact: 'Grooming fills their fur with tiny air bubbles that keep the cold out.',
    },
    {
      q: 'Where does a sea otter mom carry her pup?',
      answers: ['On her tummy', 'On her head', 'In her mouth', 'On a leaf'],
      hint: 'Sea otters float on their backs.',
      fact: 'A pup is so fluffy it floats like a little cork.',
    },
    {
      q: 'What do sea otters wrap themselves in so they don\'t float away?',
      answers: ['Giant kelp seaweed', 'Towels', 'Fishing nets', 'Bubbles'],
      hint: 'A tall, tangly plant that grows in the sea.',
      fact: 'Kelp works like an anchor while they nap.',
    },
    {
      q: 'Some tiny sea creatures make waves glow blue at night. What is that called?',
      answers: ['Bioluminescence', 'Electricity', 'Starshine', 'Moonburn'],
      hint: '"Bio" means life and "lumin" means light.',
      fact: 'Fireflies make their own light the same way.',
    },
    {
      q: 'Who lights up the tide at night on Seafoam Shores?',
      answers: ['The Axolotters', 'The Squffalos', 'The Raccatoos', 'The moon fish'],
      hint: 'Seafoam Shores is their home.',
      fact: 'Axel is an Axolotter, part axolotl and part otter.',
    },
    {
      q: 'What does the moon bring to Seafoam Shores each month?',
      answers: ['Mounds of foam', 'Snow', 'Pancakes', 'Rocks'],
      hint: "It's in the name of the beach.",
      fact: 'The foam piles up along the sand like bubble mountains.',
    },
    {
      q: 'Real sea foam is made from...',
      answers: ['Seawater whipped up by waves', 'Soap', 'Fallen clouds', 'Whipped cream'],
      hint: 'Waves splash and churn the water.',
      fact: 'Bits of tiny sea plants help the bubbles stick together.',
    },
    {
      q: 'Coral reefs are built by...',
      answers: ['Tiny animals', 'Rocks rolling together', 'Divers', 'Mermaids'],
      hint: 'Coral looks like a plant or a rock, but it is alive.',
      fact: 'Coral reefs are home to about a quarter of all ocean fish.',
    },
    {
      q: 'Where do sea turtles lay their eggs?',
      answers: ['On sandy beaches', 'In treetops', 'On the sea floor', 'In caves'],
      hint: 'They crawl out of the water to dig a nest.',
      fact: 'The babies hatch and race down to the sea.',
    },
    {
      q: 'Which of these grows on a palm tree?',
      answers: ['Coconuts', 'Apples', 'Pumpkins', 'Grapes'],
      hint: 'Hard and hairy on the outside, with juice inside.',
      fact: 'Coconuts can float across the ocean and grow on new beaches.',
    },
    {
      q: 'How many brains does a jellyfish have?',
      answers: ['None', 'One', 'Two', 'Ten'],
      hint: 'It is mostly water.',
      fact: 'Jellyfish use a simple net of nerves instead of a brain.',
    },
    {
      q: 'What makes most ocean waves?',
      answers: ['The wind', 'Fish swimming', 'Whales splashing', 'Boats'],
      hint: 'Blow across a bowl of water and watch.',
      fact: 'The stronger and longer the wind blows, the bigger the waves.',
    },
    {
      q: 'Tropical beaches are usually...',
      answers: ['Warm all year', 'Snowy all year', 'Dark all day', 'Up on mountaintops'],
      hint: 'Swimsuit weather.',
      fact: 'The tropics are the warm part of Earth near the equator.',
    },
    {
      q: 'Axel is a...',
      answers: ['Daredevil', 'Scaredy-cat', 'Sleepyhead', 'Grump'],
      hint: "He's always first to jump off the highest rock.",
      fact: 'Real otters are playful too. They slide down muddy banks for fun!',
    },
    {
      q: 'What does Axel often carry?',
      answers: ['A shell', 'A map', 'An umbrella', 'A drum'],
      hint: 'Something you find on the beach.',
      fact: 'Otters often keep a favorite object, just like Axel.',
    },
    {
      q: 'Some otters love to play by...',
      answers: ['Juggling pebbles', 'Knitting', 'Singing songs', 'Painting'],
      hint: 'They toss small stones around with their paws.',
      fact: 'Asian small-clawed otters roll and juggle pebbles for fun.',
    },
    {
      q: 'About how many hairs does a sea otter have on a patch the size of a stamp?',
      answers: ['About a million', 'About ten', 'About fifty', 'None'],
      hint: 'Remember, it has the thickest fur of any animal.',
      fact: 'You have about a hundred thousand hairs on your whole head!',
    },
    {
      q: 'The name "axolotl" comes from which language?',
      answers: ['Nahuatl, spoken by the Aztecs', 'English', 'Russian', 'Chinese'],
      hint: 'A language spoken in Mexico long ago, and still today.',
      fact: 'It is often said to mean "water monster."',
    },
    {
      q: 'Axolotls always look like they are...',
      answers: ['Smiling', 'Crying', 'Sneezing', 'Yawning'],
      hint: 'Look at the shape of their mouth.',
      fact: "That happy face is just how an axolotl's mouth is shaped.",
    },
  ],

  bamboo: [
    {
      q: 'Ricky is part raccoon. What part of a raccoon is extra good at feeling things?',
      answers: ['Its front paws', 'Its tail', 'Its ears', 'Its knees'],
      hint: 'They work a lot like your hands.',
      fact: 'Raccoons feel around for food with their clever front paws.',
    },
    {
      q: 'Ricky is part cockatoo. What can a cockatoo raise up on its head?',
      answers: ['A crest of feathers', 'A horn', 'Antlers', 'A shell'],
      hint: 'Look at the blue feathers on top of Ricky.',
      fact: 'Cockatoos raise their crest when they are excited.',
    },
    {
      q: 'What pattern does a raccoon have on its face?',
      answers: ['A dark mask around its eyes', 'Rainbow stripes', 'Big orange spots', 'No markings at all'],
      hint: 'It makes them look like little bandits.',
      fact: 'The dark mask may help cut down glare, so raccoons see better at night.',
    },
    {
      q: "What pattern is on a raccoon's tail?",
      answers: ['Rings', 'Spots', 'Zigzags', 'Hearts'],
      hint: "Look at Ricky's tail.",
      fact: 'Most raccoons have between five and seven dark rings.',
    },
    {
      q: 'Raccoons often dip their food in water. Why might they do it?',
      answers: ['Wet paws feel the food better', 'To make soup', 'To cool it down', 'To count it'],
      hint: 'Remember how sensitive their paws are.',
      fact: 'Water makes the nerves in their paws even more sensitive.',
    },
    {
      q: 'Raccoons are mostly awake at...',
      answers: ['Night', 'Lunchtime', 'Breakfast', 'Never'],
      hint: 'When you are fast asleep.',
      fact: 'Animals that are awake at night are called nocturnal.',
    },
    {
      q: 'Where do wild cockatoos come from?',
      answers: ['Australia and nearby islands', 'Antarctica', 'The North Pole', 'Iceland'],
      hint: 'The same part of the world as kangaroos.',
      fact: 'Some cockatoos live in big, noisy flocks of hundreds of birds.',
    },
    {
      q: 'A cockatoo named Snowball became famous for...',
      answers: ['Dancing to music', 'Swimming', 'Breathing fire', 'Knitting'],
      hint: 'Ricky is a party animal too.',
      fact: 'Snowball could bob and stomp along to the beat.',
    },
    {
      q: 'Some cockatoos can live as long as...',
      answers: ['A grandparent', 'A week', 'One summer', 'A day'],
      hint: 'Much longer than a dog or a cat.',
      fact: 'Some cockatoos live 60 years or more.',
    },
    {
      q: "How are a cockatoo's toes arranged?",
      answers: ['Two in front, two behind', 'All in front', 'Just one toe', 'Ten toes'],
      hint: 'Perfect for gripping a branch from both sides.',
      fact: 'Cockatoos can hold food up to their beak with one foot, like a hand.',
    },
    {
      q: 'Raccoons are famous for opening...',
      answers: ['Latches and lids', 'Umbrellas', 'Books', 'Oysters at restaurants'],
      hint: 'Ask anyone who has a trash can outside.',
      fact: 'Raccoons can remember how to solve a puzzle for years.',
    },
    {
      q: 'What makes a desert a desert?',
      answers: ['Very little rain', 'Lots of snow', 'Lots of trees', 'Lots of lakes'],
      hint: 'Think about what deserts are missing.',
      fact: 'Antarctica counts as a desert too, because it hardly ever snows there!',
    },
    {
      q: 'What builds the big sand dunes in a desert?',
      answers: ['The wind', 'Moles', 'Rain', 'Camels'],
      hint: 'Whoosh!',
      fact: 'Wind pushes sand into hills that slowly move across the desert.',
    },
    {
      q: "What is stored in a camel's hump?",
      answers: ['Fat', 'Water', 'Sand', 'Snacks'],
      hint: "Most people guess water, but that's not it.",
      fact: 'The fat in the hump gives a camel energy when food is hard to find.',
    },
    {
      q: 'A green spot in the desert with water is called...',
      answers: ['An oasis', 'An island', 'A glacier', 'A swamp'],
      hint: 'Bamboo Dunes has some that come and go.',
      fact: 'Desert travelers have used oases as rest stops for thousands of years.',
    },
    {
      q: 'Bamboo is actually a kind of...',
      answers: ['Grass', 'Tree', 'Rock', 'Mushroom'],
      hint: 'The same family as your lawn, just much, much taller.',
      fact: 'Some bamboo grows taller than a house.',
    },
    {
      q: 'Which plant is one of the fastest-growing in the world?',
      answers: ['Bamboo', 'Cactus', 'Oak tree', 'Moss'],
      hint: "You're surrounded by it in this level.",
      fact: 'Some bamboo can grow about 3 feet (90 cm) in a single day!',
    },
    {
      q: 'Which black-and-white bear eats bamboo almost all day long?',
      answers: ['The giant panda', 'The polar bear', 'The brown bear', 'The sun bear'],
      hint: 'It has black patches around its eyes.',
      fact: 'A panda can spend 12 hours a day eating bamboo.',
    },
    {
      q: 'Where does a cactus keep its water?',
      answers: ['Inside its thick stem', 'In its spines', 'In a bucket', 'In its flowers'],
      hint: 'The fat, green part is full of it.',
      fact: 'A big cactus can soak up a huge amount of water after one rainstorm.',
    },
    {
      q: 'Hot deserts can get very what at night?',
      answers: ['Cold', 'Snowy', 'Rainy', 'Loud'],
      hint: 'There are no clouds to hold in the heat.',
      fact: 'Some deserts are hot by day and near freezing at night.',
    },
    {
      q: 'Why do stars seem to twinkle?',
      answers: ['Moving air bends their light', 'They blink on and off', 'They are winking', 'Birds fly past them'],
      hint: 'Their light has to pass through our wobbly air.',
      fact: 'In space, stars shine steadily without twinkling.',
    },
    {
      q: 'Our Sun is a...',
      answers: ['Star', 'Planet', 'Moon', 'Comet'],
      hint: 'It is the closest one to Earth.',
      fact: 'The Sun is so big that about a million Earths could fit inside it.',
    },
    {
      q: 'A group of stars that makes a picture in the sky is called a...',
      answers: ['Constellation', 'Comet', 'Cuddleherd', 'Rainbow'],
      hint: 'The Big Dipper is one.',
      fact: 'People have told stories about constellations for thousands of years.',
    },
    {
      q: 'What do the bamboo oases in Bamboo Dunes do?',
      answers: ['Appear and vanish', 'Float in the air', 'Sing at night', 'Turn into snow'],
      hint: 'Now you see them, now you don\'t.',
      fact: 'Travelers in Bamboo Dunes never know where the next oasis will be.',
    },
    {
      q: 'Whose favorite stargazing spot is Bamboo Dunes?',
      answers: ['Charlie', 'Shaan', 'Axel', 'Sofia'],
      hint: 'The leader of the pack.',
      fact: 'Charlie comes all the way from the rainforest to see the stars.',
    },
    {
      q: 'Ricky is known as a...',
      answers: ['Party animal', 'Grump', 'Sleepyhead', 'Scaredy-cat'],
      hint: 'He loves music, snacks and friends.',
      fact: 'Real cockatoos are loud, chatty and love company.',
    },
    {
      q: 'In a hot desert, a shimmery "puddle" that isn\'t really there is called a...',
      answers: ['Mirage', 'Rainbow', 'Shadow', 'Geyser'],
      hint: 'A trick of the light on hot ground.',
      fact: 'Hot air near the ground bends light from the sky, so it looks like water.',
    },
    {
      q: "A fennec fox's giant ears help it...",
      answers: ['Stay cool and hear bugs', 'Fly', 'Swim', 'Catch rain'],
      hint: 'Two jobs: hearing and beating the heat.',
      fact: 'Fennec foxes can hear insects moving under the sand.',
    },
    {
      q: 'What is a baby raccoon called?',
      answers: ['A kit', 'A puppy', 'A chick', 'A calf'],
      hint: 'Same as a baby fox.',
      fact: 'Raccoon kits stay with their mom for about a year.',
    },
    {
      q: 'The Sahara is a huge desert on which continent?',
      answers: ['Africa', 'Europe', 'Antarctica', 'South America'],
      hint: 'The same continent where cheetahs and chimps live.',
      fact: 'The Sahara is about as big as the whole United States.',
    },
  ],

  squvannahs: [
    {
      q: "Sofia is part squirrel. What is special about a squirrel's front teeth?",
      answers: ['They never stop growing', 'They fall out every winter', 'They glow at night', 'They are made of wood'],
      hint: 'That is why squirrels chew so much.',
      fact: "Chewing nuts keeps a squirrel's teeth from getting too long.",
    },
    {
      q: 'Sofia is part buffalo. American bison are the biggest land animals in which place?',
      answers: ['North America', 'Africa', 'Antarctica', 'Australia'],
      hint: 'They are called American bison.',
      fact: 'An adult bison can weigh as much as a small car.',
    },
    {
      q: 'Squirrels bury nuts to eat later. What can happen to the nuts they forget?',
      answers: ['They grow into trees', 'They turn into rocks', 'They hatch into birds', 'They melt'],
      hint: 'A nut is really a seed.',
      fact: 'Forgetful squirrels help plant whole forests!',
    },
    {
      q: 'Sofia is part squirrel. What does a squirrel use its fluffy tail for?',
      answers: ['Balance and keeping warm', 'Digging holes', 'Swimming fast', 'Catching bugs'],
      hint: 'Two jobs: staying steady on branches and staying cozy.',
      fact: 'A squirrel can wrap its tail around itself like a blanket.',
    },
    {
      q: 'Bison love to roll around in the dirt. What is that called?',
      answers: ['Wallowing', 'Waddling', 'Whistling', 'Waving'],
      hint: 'It starts with W, like rolling in a big muddy puddle.',
      fact: 'Rolling in the dust helps keep biting bugs away.',
    },
    {
      q: 'Bison look slow, but they can run about as fast as...',
      answers: ['A horse', 'A snail', 'A turtle', 'A jet'],
      hint: 'Pretty fast, for something that big.',
      fact: 'Bison can run about 35 miles (55 km) an hour.',
    },
    {
      q: 'The bison is the national mammal of which country?',
      answers: ['The United States', 'France', 'Japan', 'Kenya'],
      hint: 'Remember where American bison live.',
      fact: 'It became the national mammal in 2016.',
    },
    {
      q: "What is inside a bison's big shoulder hump?",
      answers: ['Strong muscles', 'Water', 'Sand', 'A spare stomach'],
      hint: 'It helps the bison swing its heavy head.',
      fact: 'Bison use their heads like snowplows to reach grass in winter.',
    },
    {
      q: 'Baby bison are nicknamed "red dogs." Why?',
      answers: ['Their fur is orange-red', 'They bark', 'They chase balls', 'They wag their tails'],
      hint: 'Look at the color of a newborn calf.',
      fact: 'Their coats turn dark brown after a few months.',
    },
    {
      q: 'In North America, people often call bison by what other name?',
      answers: ['Buffalo', 'Moose', 'Llama', 'Yak'],
      hint: "It's the other half of Sofia's name: Squ-ffalo.",
      fact: 'True buffalo live in Africa and Asia, but the name stuck.',
    },
    {
      q: "Flying squirrels can't really fly. What do they do instead?",
      answers: ['Glide', 'Flap', 'Hover', 'Teleport'],
      hint: 'Like a paper airplane.',
      fact: 'Flaps of skin between their legs work like a parachute.',
    },
    {
      q: "A squirrel's nest of leaves and twigs is called a...",
      answers: ['Drey', 'Hive', 'Web', 'Pond'],
      hint: 'It rhymes with "day."',
      fact: 'Squirrels may build several dreys and switch between them.',
    },
    {
      q: 'Squirrels can run down a tree trunk...',
      answers: ['Head first', 'Only backwards', 'Only with a rope', 'Never'],
      hint: 'Their back ankles can twist all the way around.',
      fact: 'Turning their back feet lets their claws grip on the way down.',
    },
    {
      q: 'Why do squirrels flick their tails?',
      answers: ['To warn others', 'To fan themselves', 'To count', 'To dry off'],
      hint: 'It is a signal: watch out!',
      fact: 'A twitching tail can also tell a hawk, "I see you!"',
    },
    {
      q: 'A grassland with a few scattered trees, like in Africa, is called a...',
      answers: ['Savanna', 'Glacier', 'Reef', 'Swamp'],
      hint: "This level's name sounds a bit like it!",
      fact: 'Zebras, giraffes and lions live on the African savanna.',
    },
    {
      q: 'The Squvannahs are named after...',
      answers: ['The Squffalo', 'A river', 'A star', 'A cloud'],
      hint: 'Who lives here?',
      fact: 'Sofia is a Squffalo, part squirrel and part buffalo.',
    },
    {
      q: 'What happens to the Royal River every rainy season?',
      answers: ['It floods', 'It freezes', 'It vanishes', 'It turns pink'],
      hint: 'Too much rain at once.',
      fact: 'Floods bring fresh mud that helps the grass grow.',
    },
    {
      q: "How often does the bison'tennial loosestrife bloom?",
      answers: ['One day a year', 'All year long', 'Every hour', 'Never'],
      hint: "Don't blink, or you'll miss it!",
      fact: 'It is one of the rarest sights in the Squvannahs.',
    },
    {
      q: 'Prairie dogs live together in underground...',
      answers: ['Towns', 'Trees', 'Sky nests', 'Ponds'],
      hint: 'Lots of homes all connected, like a city.',
      fact: 'Some prairie dog towns stretch for miles.',
    },
    {
      q: 'Why can grass grow back after a bison eats it?',
      answers: ['It grows from the bottom, not the tip', "It's made of plastic", 'Rain glues it back', 'It never gets eaten'],
      hint: 'Think about mowing a lawn.',
      fact: 'That is why grasslands can feed huge herds year after year.',
    },
    {
      q: 'Many grasslands have two big seasons. What are they?',
      answers: ['Wet and dry', 'Hot and hotter', 'Snow and ice', 'Day and night'],
      hint: 'One rainy, one not.',
      fact: 'Many animals travel long distances to follow the rain.',
    },
    {
      q: 'Which tall grassland animal eats leaves from the tops of trees?',
      answers: ['The giraffe', 'The penguin', 'The hippo', 'The mole'],
      hint: 'It has the longest neck of any animal.',
      fact: "A giraffe's tongue can be about as long as your arm.",
    },
    {
      q: "Every zebra's stripes are...",
      answers: ['Different, like fingerprints', 'Exactly the same', 'Painted on', 'Spots'],
      hint: 'No two are alike.',
      fact: 'Scientists think stripes may help keep biting flies away.',
    },
    {
      q: 'How would you describe Sofia?',
      answers: ['Effortlessly cool', 'Very grumpy', 'Always sleepy', 'Scared of everything'],
      hint: 'Calm, confident and never in a rush.',
      fact: 'Sofia sits up tall like a squirrel, with her huge curly tail behind her.',
    },
    {
      q: 'What is Sofia usually holding?',
      answers: ['An acorn', 'A map', 'A drum', 'A fish'],
      hint: 'A squirrel favorite.',
      fact: 'Squirrels can bury thousands of acorns in one autumn.',
    },
    {
      q: 'What does Sofia wear around her neck?',
      answers: ['A red neckerchief', 'A gold medal', 'A bow tie', 'A scarf made of leaves'],
      hint: 'A cowboy-style cloth, in red.',
      fact: 'Cowboys wore neckerchiefs to keep dust out of their faces on the plains.',
    },
    {
      q: 'Acorns grow on which tree?',
      answers: ['Oak', 'Pine', 'Palm', 'Apple'],
      hint: 'A big, strong tree with wavy leaves.',
      fact: 'A big oak tree can drop thousands of acorns in one year.',
    },
    {
      q: 'How do squirrels find the nuts they buried?',
      answers: ['Memory and their nose', 'A treasure map', 'Asking birds', 'Pure luck only'],
      hint: 'They remember, and they sniff.',
      fact: 'Squirrels can smell nuts buried under the snow.',
    },
    {
      q: 'Which bison have horns?',
      answers: ['Both boys and girls', 'Only boys', 'Only girls', 'Neither'],
      hint: 'Everyone in the herd gets a pair.',
      fact: 'Bison keep the same horns their whole lives.',
    },
    {
      q: 'In Zebonkia, a group of same-species Zebonkies that live and travel together is a...',
      answers: ['Cuddleherd', 'Cuddlepuddle', 'Snugglebunch', 'Fuzzpack'],
      hint: 'Like a herd of bison, but cuddlier.',
      fact: 'A cuddleherd lives, eats and travels together.',
    },
  ],

  magenta: [
    {
      q: 'Unity is part scorpion. What happens when you shine a black light on a scorpion?',
      answers: ['It glows', 'It disappears', 'It grows bigger', 'It starts to sing'],
      hint: 'Like a glow-in-the-dark sticker.',
      fact: 'Scorpions glow blue-green under ultraviolet light.',
    },
    {
      q: 'How many legs does a scorpion have?',
      answers: ['8', '6', '4', '10'],
      hint: 'The same as a spider.',
      fact: 'Scorpions are arachnids, like spiders, so they have eight legs.',
    },
    {
      q: 'Unity is part unicorn. Which country has the unicorn as its national animal?',
      answers: ['Scotland', 'Brazil', 'Japan', 'Egypt'],
      hint: 'A country famous for castles and bagpipes.',
      fact: 'You can find unicorns carved on old buildings all over Scotland.',
    },
    {
      q: 'Unity is part scorpion. Where do baby scorpions ride after they are born?',
      answers: ["On their mother's back", 'In a nest of leaves', 'Inside a shell', 'On a bird'],
      hint: 'Piggyback ride!',
      fact: 'The babies hold on tight until they are big enough to be on their own.',
    },
    {
      q: 'What do we call a long line of mountains together?',
      answers: ['A mountain range', 'A mountain pile', 'A mountain herd', 'A mountain cloud'],
      hint: 'The same word as a kitchen stove.',
      fact: 'Some mountain ranges stretch across whole countries.',
    },
    {
      q: "Where is a scorpion's stinger?",
      answers: ['At the tip of its tail', 'On its claws', 'On its nose', 'On its feet'],
      hint: "Look at Unity's curled tail.",
      fact: 'Most scorpions only sting to protect themselves.',
    },
    {
      q: "A scorpion's two big claws are called...",
      answers: ['Pincers', 'Paws', 'Flippers', 'Hooves'],
      hint: 'They pinch!',
      fact: "Unity's pincers are lavender.",
    },
    {
      q: 'Some scorpions can go how long without eating?',
      answers: ['Up to a year', 'One minute', 'One hour', 'One day'],
      hint: 'A very, very long time.',
      fact: 'Scorpions slow their bodies down to save energy.',
    },
    {
      q: 'When do most scorpions come out to hunt?',
      answers: ['At night', 'At noon', 'At breakfast', 'Only on birthdays'],
      hint: 'That is when the black light trick works best.',
      fact: 'Scorpions hide under rocks during the hot day.',
    },
    {
      q: 'Scorpions have been on Earth since...',
      answers: ['Long before the dinosaurs', 'Last year', 'Cars were invented', 'Your grandparents were kids'],
      hint: 'Really, really, really long ago.',
      fact: 'Scorpions are over 400 million years old as a group!',
    },
    {
      q: "In old stories, what could a unicorn's horn do?",
      answers: ['Clean poisoned water', 'Shoot lasers', 'Make it fly', 'Tell the time'],
      hint: 'It was said to make things safe to drink.',
      fact: 'People once paid fortunes for "unicorn horns" that were really narwhal tusks.',
    },
    {
      q: 'Which real sea animal has a long spiral tusk like a unicorn horn?',
      answers: ['The narwhal', 'The dolphin', 'The octopus', 'The seal'],
      hint: "It's called the unicorn of the sea.",
      fact: 'That "horn" is really a very long tooth.',
    },
    {
      q: 'Unity is known for being...',
      answers: ['One with nature', 'Very loud', 'Lazy', 'Scared of flowers'],
      hint: 'Unity loves plants, animals and the outdoors.',
      fact: 'Unity is part unicorn and part scorpion.',
    },
    {
      q: "What colors are in Unity's mane?",
      answers: ['Pink, blue and purple', 'Green and orange', 'Black only', 'Red and yellow'],
      hint: 'The colors of a sunset over the Magenta Mountains.',
      fact: 'Unity is white, with a horn and a curled scorpion tail.',
    },
    {
      q: 'The Magenta Mountains are made of...',
      answers: ['Tanzanite', 'Cheese', 'Ice', 'Sand'],
      hint: 'A purple-blue crystal.',
      fact: 'The whole mountain range shimmers when the light changes.',
    },
    {
      q: "What color does the Magenta Mountains' tanzanite turn under clouds?",
      answers: ['Violet', 'Green', 'Orange', 'Black'],
      hint: 'It is blue in the sun.',
      fact: 'Real tanzanite also looks different colors from different sides.',
    },
    {
      q: 'Real tanzanite gems are found in only one country. Which one?',
      answers: ['Tanzania', 'Iceland', 'Canada', 'Peru'],
      hint: 'The gem is named after it.',
      fact: 'It is mined near Mount Kilimanjaro in Africa.',
    },
    {
      q: "What is at the top of Mt. Tanzan?",
      answers: ['A healing cave', 'A pizza shop', 'A lake of lava', 'A dragon'],
      hint: 'A place to feel better.',
      fact: 'Zebonkies climb Mt. Tanzan when they need to heal.',
    },
    {
      q: 'What is the tallest mountain above sea level?',
      answers: ['Mount Everest', 'Mount Fuji', 'Mount Kilimanjaro', 'Pikes Peak'],
      hint: 'It is in the Himalayas.',
      fact: 'Mount Everest is over 29,000 feet (8,800 m) tall.',
    },
    {
      q: 'The higher you climb a mountain, the air gets...',
      answers: ['Thinner and colder', 'Hotter', 'Sweeter', 'Thicker'],
      hint: 'Climbers sometimes carry extra air in tanks.',
      fact: 'Thin air has less oxygen, so climbers get tired faster.',
    },
    {
      q: 'Why can tall mountain tops stay snowy even in summer?',
      answers: ["It's colder up high", 'Clouds drop marshmallows', 'Snow is glued on', 'The sun skips them'],
      hint: 'The higher you go, the chillier it gets.',
      fact: 'Some mountains near the equator still have snow on top!',
    },
    {
      q: 'Mountain goats have special hooves that...',
      answers: ['Grip rocky cliffs', 'Melt snow', 'Make music', 'Dig tunnels'],
      hint: 'Like grippy shoes for climbing.',
      fact: 'Soft pads inside the hooves stick to the rocks.',
    },
    {
      q: 'You shout in the mountains and hear your voice come back. What is that?',
      answers: ['An echo', 'A ghost', 'A thunderclap', 'A rumble'],
      hint: 'Your sound bounces off the rocks.',
      fact: 'Bats and dolphins use echoes to find their way.',
    },
    {
      q: 'Crystals usually have...',
      answers: ['Flat sides and sharp edges', 'Fur', 'Bones', 'Leaves'],
      hint: 'Look at the purple mountains in this level.',
      fact: 'The flat sides of a crystal are called facets.',
    },
    {
      q: 'When a lot of snow suddenly slides down a mountain, it is called an...',
      answers: ['Avalanche', 'Earthquake', 'Tornado', 'Eclipse'],
      hint: 'It starts with A.',
      fact: 'Rescue dogs help find people after an avalanche.',
    },
    {
      q: 'A giant, slow-moving river of ice is called a...',
      answers: ['Glacier', 'Geyser', 'Lake', 'Puddle'],
      hint: 'It starts with G and is very, very cold.',
      fact: 'Glaciers carve out valleys as they slowly slide.',
    },
    {
      q: 'Scorpions live on every continent except...',
      answers: ['Antarctica', 'Africa', 'Asia', 'South America'],
      hint: 'The coldest one.',
      fact: 'Some scorpions even live high in the mountains.',
    },
    {
      q: 'Which bird builds big nests high on mountain cliffs?',
      answers: ['The eagle', 'The penguin', 'The chicken', 'The flamingo'],
      hint: 'A powerful bird with very sharp eyes.',
      fact: 'An eagle can spot a rabbit from more than a mile away.',
    },
    {
      q: 'Which fluffy animal lives in the Andes mountains and sometimes spits?',
      answers: ['The llama', 'The koala', 'The kangaroo', 'The hedgehog'],
      hint: 'It rhymes with "mama."',
      fact: 'People have used llamas to carry things over mountains for thousands of years.',
    },
    {
      q: 'Many mountains formed when...',
      answers: ["Huge pieces of Earth's crust pushed together", 'Giants piled up rocks', 'It snowed for a year', 'Moles dug very deep'],
      hint: 'The ground under us is made of giant moving pieces.',
      fact: 'The Himalayas are still growing a tiny bit every year.',
    },
  ],

  volcano: [
    {
      q: 'What do we call hot melted rock that pours out of a volcano?',
      answers: ['Lava', 'Snow', 'Sand', 'Sap'],
      hint: 'Glowing, orange and very hot.',
      fact: 'Lava can be hotter than 1,000 degrees!',
    },
    {
      q: 'Every Zebonky is a mix of how many animals?',
      answers: ['Two', 'One', 'Five', 'Ten'],
      hint: 'Charlie is chimpanzee and cheetah.',
      fact: 'Like Charlie, who is part chimpanzee and part cheetah.',
    },
    {
      q: 'What lightning symbol does every Zebonky have on its chest?',
      answers: ['A Z-Bolt', 'A Z-Star', 'A Z-Moon', 'A Z-Heart'],
      hint: 'A zigzag like lightning.',
      fact: 'A Z-Bolt pulses in danger and glows when a Zebonky wins.',
    },
    {
      q: 'A volcano that is sleeping but could wake up someday is called...',
      answers: ['Dormant', 'Extinct', 'Melted', 'Hollow'],
      hint: 'A fancy word for sleeping.',
      fact: 'Dormant means sleeping.',
    },
    {
      q: 'When lava cools down, what does it turn into?',
      answers: ['Rock', 'Water', 'Sand castles', 'Glass bottles'],
      hint: 'It was melted rock to begin with.',
      fact: 'Some islands, like Hawaii, are made from cooled lava.',
    },
    {
      q: 'Melted rock that is still deep underground is called...',
      answers: ['Magma', 'Lava', 'Mud', 'Jelly'],
      hint: 'It only gets called lava once it comes out.',
      fact: 'Magma rises up through cracks to reach the top of a volcano.',
    },
    {
      q: 'The bowl-shaped hole at the top of a volcano is called a...',
      answers: ['Crater', 'Bucket', 'Basket', 'Chimney'],
      hint: 'The Moon is covered in them too.',
      fact: 'Some old craters fill up with rain and become lakes.',
    },
    {
      q: 'When a volcano erupts, it can shoot out a giant cloud of...',
      answers: ['Ash', 'Cotton candy', 'Bubbles', 'Snowflakes'],
      hint: 'Gray and powdery, like after a campfire.',
      fact: 'Volcanic ash can travel all the way around the world.',
    },
    {
      q: 'The "Ring of Fire," with lots of volcanoes, goes around which ocean?',
      answers: ['The Pacific', 'The Atlantic', 'The Arctic', 'The Indian'],
      hint: 'The biggest ocean of all.',
      fact: 'Most of the world\'s active volcanoes are on the Ring of Fire.',
    },
    {
      q: 'A sacred cave where a Z-Stone can be found is called a...',
      answers: ['Z-Cave', 'Z-House', 'Z-Hole', 'Z-Tunnel'],
      hint: 'Look at the name of this level.',
      fact: 'Z-Caves are hidden all over Zebonkia.',
    },
    {
      q: 'The Z-Stone is rumored to be the secret behind...',
      answers: ['The Zebonky hybrids', 'Rainbows', 'Ice cream', 'Thunder'],
      hint: 'Why are Zebonkies two animals in one?',
      fact: 'A Z-Stone is a magical crystal.',
    },
    {
      q: 'A Zebonky switches on its Z-Power through its...',
      answers: ['Z-Bolt', 'Magic wand', 'Hat', 'Tail'],
      hint: 'The lightning mark on its chest.',
      fact: 'Z-Power is a short burst of magic, and each species has its own.',
    },
    {
      q: 'What is the world the Zebonkies live in called?',
      answers: ['Zebonkia', 'Zebraland', 'Bonkytown', 'Planet Z'],
      hint: 'It sounds just like Zebonky.',
      fact: 'Zebonkia has grasslands, rainforest, beaches, dunes and mountains.',
    },
    {
      q: "A Zebonky's Z-Bolt pulses when there is...",
      answers: ['Danger', 'Lunch', 'Music', 'Snow'],
      hint: 'It is a warning sign.',
      fact: 'When a Zebonky wins, the Z-Bolt glows instead.',
    },
    {
      q: 'Lava that cools super fast can make shiny black glass called...',
      answers: ['Obsidian', 'Diamond', 'Plastic', 'Ice'],
      hint: 'It starts with O.',
      fact: 'Long ago, people made sharp tools from obsidian.',
    },
    {
      q: 'Plants grow well near old volcanoes because the soil is...',
      answers: ['Full of good stuff from old ash', 'Warm like a blanket', 'Full of candy', 'Painted purple'],
      hint: 'Old ash and rock break down into plant food.',
      fact: 'Farmers have grown crops on volcano slopes for thousands of years.',
    },
    {
      q: 'A hot spring that shoots water high into the air is a...',
      answers: ['Geyser', 'Glacier', 'Gully', 'Garden hose'],
      hint: 'Old Faithful is a famous one.',
      fact: 'Old Faithful in Yellowstone erupts many times every day.',
    },
    {
      q: 'Where are most of the volcanoes on Earth?',
      answers: ['Under the ocean', 'On the Moon', 'In cities', 'In deserts'],
      hint: 'Somewhere we can\'t easily see.',
      fact: 'Many islands are the tops of undersea volcanoes.',
    },
    {
      q: 'The biggest volcano we know of is on which planet?',
      answers: ['Mars', 'Earth', 'Saturn', 'The Sun'],
      hint: 'The red planet.',
      fact: 'Olympus Mons on Mars is about three times taller than Mount Everest.',
    },
    {
      q: 'Which Zebonky is a daredevil?',
      answers: ['Axel', 'Sofia', 'Unity', 'Shaan'],
      hint: 'The one with frilly gills.',
      fact: 'Axel is part axolotl and part otter.',
    },
    {
      q: 'Which Zebonky is part shark?',
      answers: ['Shaan', 'Ricky', 'Charlie', 'Sofia'],
      hint: 'The one with a shell.',
      fact: 'Shaan is part shark and part armadillo.',
    },
    {
      q: 'Which Zebonky is part squirrel and part buffalo?',
      answers: ['Sofia', 'Unity', 'Axel', 'Ricky'],
      hint: 'She holds an acorn.',
      fact: 'Sofia lives in the Squvannahs.',
    },
    {
      q: 'Which Zebonky has a horn and a scorpion tail?',
      answers: ['Unity', 'Charlie', 'Shaan', 'Axel'],
      hint: 'Part unicorn.',
      fact: 'Unity lives in the Magenta Mountains.',
    },
    {
      q: 'Which Zebonky is a party animal?',
      answers: ['Ricky', 'Sofia', 'Shaan', 'Unity'],
      hint: 'Part raccoon, part cockatoo.',
      fact: 'Ricky has a raccoon mask and a blue cockatoo crest.',
    },
    {
      q: 'Which Zebonky is the leader of the pack?',
      answers: ['Charlie', 'Axel', 'Ricky', 'Sofia'],
      hint: 'Part chimpanzee, part cheetah.',
      fact: 'Charlie lives in the Cumulus Rainforest.',
    },
  ],

  unchartedW: [
    {
      q: 'A group of otters resting together in the water is called a...',
      answers: ['Raft', 'Herd', 'Flock', 'Swarm'],
      hint: 'Something that floats.',
      fact: 'Some otter rafts have hundreds of otters in them!',
    },
    {
      q: 'A cockatoo is a kind of...',
      answers: ['Parrot', 'Owl', 'Penguin', 'Duck'],
      hint: 'A bird that can copy what you say.',
      fact: 'Like other parrots, cockatoos can learn to copy sounds.',
    },
    {
      q: 'The word "armadillo" means "little armored one" in which language?',
      answers: ['Spanish', 'French', 'Japanese', 'German'],
      hint: 'A language spoken in Mexico and Spain.',
      fact: 'Spanish explorers named the armadillo after its tough shell.',
    },
    {
      q: 'Which tool shows explorers which way is north?',
      answers: ['A compass', 'A ruler', 'A clock', 'A spoon'],
      hint: 'It has a needle that spins.',
      fact: 'A compass needle is a tiny magnet.',
    },
    {
      q: 'On a map, what does the key (or legend) tell you?',
      answers: ['What the symbols mean', 'How to open a door', 'What time it is', 'Who drew it'],
      hint: 'It unlocks the map\'s secret code.',
      fact: 'Map makers use little pictures so lots of places fit on one page.',
    },
    {
      q: 'On a treasure map, what marks the spot?',
      answers: ['An X', 'A circle', 'A smiley face', 'A question mark'],
      hint: 'Two crossed lines.',
      fact: 'Real pirates hardly ever buried their treasure!',
    },
    {
      q: 'How many continents are there on Earth?',
      answers: ['Seven', 'Two', 'Twelve', 'One hundred'],
      hint: 'Same as the days in a week.',
      fact: 'Asia is the biggest continent.',
    },
    {
      q: 'Which is the biggest ocean on Earth?',
      answers: ['The Pacific', 'The Atlantic', 'The Indian', 'The Arctic'],
      hint: 'Its name means "peaceful."',
      fact: 'The Pacific is bigger than all the land on Earth put together.',
    },
    {
      q: 'The imaginary line around the middle of Earth is called the...',
      answers: ['Equator', 'Belt', 'Zipper', 'Border'],
      hint: 'It starts with E.',
      fact: 'Places near the equator are warm all year.',
    },
    {
      q: 'Explorers use a telescope to...',
      answers: ['See things far away', 'Hear whispers', 'Cook food', 'Measure rain'],
      hint: 'Pirates look through one from the crow\'s nest.',
      fact: 'The first telescopes were made over 400 years ago.',
    },
    {
      q: 'Land with water all around it is called an...',
      answers: ['Island', 'Ocean', 'Iceberg', 'Inlet'],
      hint: 'Castaways get stranded on one.',
      fact: 'Greenland is the biggest island in the world.',
    },
    {
      q: 'What does the "N" on a compass stand for?',
      answers: ['North', 'Nowhere', 'Nest', 'Night'],
      hint: 'The direction the needle points.',
      fact: 'The other letters are E for east, S for south and W for west.',
    },
  ],

  unchartedE: [
    {
      q: 'Can a cheetah roar like a lion?',
      answers: ['No, it purrs and chirps', 'Yes, louder than a lion', 'Only underwater', 'Only at night'],
      hint: 'Cheetahs make sounds more like a house cat, or a bird.',
      fact: "A cheetah's chirp sounds a lot like a bird!",
    },
    {
      q: 'Sharks have been swimming in the ocean since...',
      answers: ['Before the dinosaurs', 'Last year', 'Cars were invented', 'About 100 years ago'],
      hint: 'A really, really long time.',
      fact: 'Sharks are older than trees, too!',
    },
    {
      q: 'Wild axolotls come from lakes in which country?',
      answers: ['Mexico', 'Canada', 'Egypt', 'Iceland'],
      hint: 'Their name comes from an Aztec word.',
      fact: 'Wild axolotls live in the canals and lakes around Mexico City.',
    },
    {
      q: 'Cheetah cubs have fluffy fur along their backs. What is it called?',
      answers: ['A mantle', 'A saddle', 'A blanket', 'A crown'],
      hint: 'A word for a cape, or a shelf over a fireplace.',
      fact: 'The fluffy mantle may help cubs hide in tall grass.',
    },
    {
      q: 'Where does the sun come up in the morning?',
      answers: ['In the east', 'In the west', 'In the north', 'In the south'],
      hint: 'This level is called Uncharted East.',
      fact: 'Explorers watch the sunrise to find which way is east.',
    },
    {
      q: 'Where does the sun go down in the evening?',
      answers: ['In the west', 'In the east', 'In the north', 'Under the sea'],
      hint: 'The opposite of where it comes up.',
      fact: 'Sunsets look orange because the light travels through more air.',
    },
    {
      q: 'Which star have sailors used for hundreds of years to find north?',
      answers: ['The North Star', 'The Sun', 'A shooting star', 'The Moon'],
      hint: 'Its name tells you which way it points.',
      fact: 'The North Star stays in almost the same spot all night.',
    },
    {
      q: 'Which old tool uses falling sand to measure time?',
      answers: ['An hourglass', 'A compass', 'A telescope', 'A shovel'],
      hint: 'It is shaped like the number 8.',
      fact: 'Sailors used sand glasses to keep track of time at sea.',
    },
    {
      q: 'How many colors are usually named in a rainbow?',
      answers: ['Seven', 'Two', 'Three', 'Twenty'],
      hint: 'Red, orange, yellow, green, blue... keep counting.',
      fact: 'You see a rainbow when the sun shines through raindrops.',
    },
    {
      q: 'Why do we see lightning before we hear thunder?',
      answers: ['Light travels faster than sound', 'Thunder is shy', 'Our ears are slow', 'Lightning is closer'],
      hint: 'One of them is the fastest thing there is.',
      fact: 'Count the seconds between them to guess how far away the storm is.',
    },
    {
      q: 'Trackers can tell which animal passed by from its...',
      answers: ['Footprints', 'Shadow', 'Favorite song', 'Name tag'],
      hint: 'Look down at the mud.',
      fact: 'A cheetah\'s footprints show its claws, but most cats\' don\'t.',
    },
    {
      q: 'When is your shadow the shortest?',
      answers: ['Around noon', 'At sunrise', 'At sunset', 'At midnight'],
      hint: 'When the sun is highest in the sky.',
      fact: 'Long ago, people told the time by watching shadows.',
    },
  ],
};

// A level run never repeats a question. Each level keeps a pile of questions
// not yet drawn; it refills once empty, leaving out any already used this run.
const unused = {};
const usedThisRun = {};

// Call when a level starts (or restarts).
export function startQuestionRun(levelId) {
  usedThisRun[levelId] = new Set();
}

// Each difficulty band has its own bank (data/difficulty.js).
const BANKS = { junior: JUNIOR_QUESTIONS, explorer: QUESTIONS, pioneer: PIONEER_QUESTIONS };

// Biomes whose real banks are in (tools/import_questions.py, from
// docs/quiz/): each band's list replaces that biome's placeholder copies.
const IMPORTED = {
  dorsal: { junior: dorsalJunior, explorer: dorsalExplorer, pioneer: dorsalPioneer },
  cumulus: { junior: cumulusJunior, explorer: cumulusExplorer, pioneer: cumulusPioneer },
  squvannahs: { junior: squvannahsJunior, explorer: squvannahsExplorer, pioneer: squvannahsPioneer },
  seafoam: { junior: seafoamJunior, explorer: seafoamExplorer, pioneer: seafoamPioneer },
  magenta: { junior: magentaJunior, explorer: magentaExplorer, pioneer: magentaPioneer },
};
Object.entries(IMPORTED).forEach(([biome, bands]) => {
  Object.entries(bands).forEach(([band, list]) => { BANKS[band][biome] = list; });
});

// A question's key in the tally of answered questions (state.answered).
export const questionKey = (q) => q.id || q.q;

// A biome's bank for a band (a biome's levels, dorsal-1 ... dorsal-5, share
// the biome's questions).
export function bankFor(levelOrBiome, band = 'explorer') {
  const all = BANKS[band] || QUESTIONS;
  return all[levelOrBiome] || all[levelOrBiome.split('-')[0]] || all.cumulus;
}

// `answered`: keys already answered right on this difficulty (state.js).
// Those not answered yet come first, so every replay moves them along the
// bank; once all are answered it draws from the whole bank again.
export function drawQuestion(levelId, band = 'explorer', answered = []) {
  const bank = bankFor(levelId, band);
  const done = new Set(answered);
  const used = usedThisRun[levelId] || (usedThisRun[levelId] = new Set());
  const key = `${band}:${levelId}`;
  let pile = (unused[key] || []).filter((q) => !used.has(q));
  const fresh = pile.filter((q) => !done.has(questionKey(q)));
  if (fresh.length) pile = fresh;
  else {
    const left = bank.filter((q) => !used.has(q) && !done.has(questionKey(q)));
    if (left.length) pile = left;
  }
  if (!pile.length) pile = bank.filter((q) => !used.has(q));
  if (!pile.length) pile = [...bank]; // more crates than questions
  const q = pile[Math.floor(Math.random() * pile.length)];
  unused[key] = pile.filter((x) => x !== q);
  used.add(q);
  return q;
}
