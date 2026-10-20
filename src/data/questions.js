// Prototype question bank: five per level, one per mystery crate, in crate
// order (the crate furthest left is the first). A crate's entry can also be a
// list of questions; the quiz then picks one at random each time.
// The first answer in each list is the correct one; the quiz shuffles them.
// Every fact here needs a source check before launch.

export const QUESTIONS = {
  dorsal: [
    {
      q: 'Shaan is part shark. What is a shark\'s skeleton made of?',
      answers: ['Cartilage', 'Bone', 'Wood', 'Seashells'],
      fact: 'Cartilage is the bendy stuff in your nose and ears!',
    },
    {
      q: 'Shaan is part armadillo. How does a three-banded armadillo stay safe?',
      answers: ['It rolls into a ball', 'It climbs a tall tree', 'It changes color', 'It sprays ink'],
      fact: 'Its hard shell closes up like an armored ball.',
    },
    {
      q: 'Sharks grow new ones of these their whole lives. What are they?',
      answers: ['Teeth', 'Fins', 'Tails', 'Eyes'],
      fact: 'When a shark loses a tooth, a new one moves up to take its place.',
    },
    {
      q: 'How can a shark find food that is far away?',
      answers: ['It smells it in the water', 'It hears music', 'It sees through rocks', 'It feels the wind'],
      fact: 'Sharks can smell tiny amounts of food from far across the water.',
    },
    {
      q: 'Shaan is part armadillo. What do armadillos mostly eat?',
      answers: ['Insects like ants and beetles', 'Fish', 'Seaweed', 'Seashells'],
      fact: 'A long sticky tongue helps an armadillo slurp up bugs.',
    },
  ],
  cumulus: [
    {
      q: 'Ricky is part raccoon. What part of a raccoon is extra good at feeling things?',
      answers: ['Its front paws', 'Its tail', 'Its ears', 'Its knees'],
      fact: 'Raccoons feel around for food with their clever front paws.',
    },
    {
      q: 'Ricky is part cockatoo. What can a cockatoo raise up on its head?',
      answers: ['A crest of feathers', 'A horn', 'Antlers', 'A shell'],
      fact: 'Cockatoos raise their crest when they are excited.',
    },
    {
      q: 'What pattern does a raccoon have on its face?',
      answers: ['A dark mask around its eyes', 'Rainbow stripes', 'Big orange spots', 'No markings at all'],
      fact: 'That dark mask makes raccoons look like little bandits.',
    },
    {
      q: 'What do we call the top layer of leaves in a rainforest?',
      answers: ['The canopy', 'The basement', 'The floor', 'The roots'],
      fact: 'Lots of rainforest animals live up in the canopy and almost never come down.',
    },
    {
      q: 'Rainforests get lots and lots of what?',
      answers: ['Rain', 'Snow', 'Sand', 'Ice'],
      fact: 'Some rainforests get rain almost every single day.',
    },
  ],
  seafoam: [
    {
      q: 'Axel is part axolotl. What amazing thing can an axolotl do?',
      answers: ['Regrow a lost leg', 'Fly short distances', 'Hibernate in snow', 'Live in a desert'],
      fact: 'Axolotls can regrow legs, tails, and even parts of their heart!',
    },
    {
      q: 'Axel is part otter. What do sea otters sometimes do so they don\'t drift apart while they sleep?',
      answers: ['Hold paws', 'Sleep standing up on land', 'Bury themselves in sand', 'Hang upside down'],
      fact: 'Floating together while holding paws keeps the group close.',
    },
    {
      q: 'Axolotls have feathery gills for breathing underwater. Where are they?',
      answers: ['On the sides of its head', 'On its tail', 'On its belly', 'Inside its toes'],
      fact: 'Those frilly gills make axolotls look like they are smiling.',
    },
    {
      q: 'Axel is part sea otter. Sea otters have the thickest what of any animal?',
      answers: ['Fur', 'Shell', 'Scales', 'Feathers'],
      fact: 'Thick fur keeps sea otters warm in cold water.',
    },
    {
      q: 'What do sea otters use to crack open shellfish?',
      answers: ['A rock', 'A stick', 'A fork', 'Their tail'],
      fact: 'They float on their backs and bang shells on a rock on their tummy.',
    },
  ],
  bamboo: [
    {
      q: 'Charlie is part cheetah. What is the fastest land animal in the world?',
      answers: ['The cheetah', 'The lion', 'The horse', 'The ostrich'],
      fact: 'A cheetah can go from standing still to top speed in just a few seconds.',
    },
    {
      q: 'Charlie is part chimpanzee. How do chimps get termites out of a mound?',
      answers: ['They poke in a stick', 'They pour in water', 'They wait for rain', 'They blow on it'],
      fact: 'Chimps use sticks as tools, just like a fishing pole!',
    },
    {
      q: 'What does a cheetah\'s long tail help it do while running?',
      answers: ['Turn and balance', 'Swim', 'Climb ropes', 'Dig holes'],
      fact: 'The tail works like a rudder when a cheetah makes sharp turns.',
    },
    {
      q: 'Charlie is part cheetah. What runs from a cheetah\'s eyes down to its mouth?',
      answers: ['Black tear marks', 'Blue stripes', 'White spots', 'Nothing at all'],
      fact: 'Those dark tear marks may help cut down the glare of the sun.',
    },
    {
      q: 'Where do chimpanzees build their beds at night?',
      answers: ['Up in the trees', 'In caves', 'Under water', 'In the sand'],
      fact: 'Chimps weave a fresh nest of leaves and branches every night.',
    },
  ],
  squvannahs: [
    {
      q: 'Sofia is part squirrel. What is special about a squirrel\'s front teeth?',
      answers: ['They never stop growing', 'They fall out every winter', 'They glow at night', 'They are made of wood'],
      fact: 'Chewing nuts keeps a squirrel\'s teeth from getting too long.',
    },
    {
      q: 'Sofia is part buffalo. American bison are the biggest land animals in which place?',
      answers: ['North America', 'Africa', 'Antarctica', 'Australia'],
      fact: 'An adult bison can weigh as much as a small car.',
    },
    {
      q: 'Squirrels bury nuts to eat later. What can happen to the nuts they forget?',
      answers: ['They grow into trees', 'They turn into rocks', 'They hatch into birds', 'They melt'],
      fact: 'Forgetful squirrels help plant whole forests!',
    },
    {
      q: 'Sofia is part squirrel. What does a squirrel use its fluffy tail for?',
      answers: ['Balance and keeping warm', 'Digging holes', 'Swimming fast', 'Catching bugs'],
      fact: 'A squirrel can wrap its tail around itself like a blanket.',
    },
    {
      q: 'Bison love to roll around in the dirt. What is that called?',
      answers: ['Wallowing', 'Waddling', 'Whistling', 'Waving'],
      fact: 'Rolling in the dust helps keep biting bugs away.',
    },
  ],
  magenta: [
    {
      q: 'Unity is part scorpion. What happens when you shine a black light on a scorpion?',
      answers: ['It glows', 'It disappears', 'It grows bigger', 'It starts to sing'],
      fact: 'Scorpions glow blue-green under ultraviolet light.',
    },
    {
      q: 'How many legs does a scorpion have?',
      answers: ['8', '6', '4', '10'],
      fact: 'Scorpions are arachnids, like spiders, so they have eight legs.',
    },
    {
      q: 'Unity is part unicorn. Which country has the unicorn as its national animal?',
      answers: ['Scotland', 'Brazil', 'Japan', 'Egypt'],
      fact: 'You can find unicorns carved on old buildings all over Scotland.',
    },
    {
      q: 'Unity is part scorpion. Where do baby scorpions ride after they are born?',
      answers: ['On their mother\'s back', 'In a nest of leaves', 'Inside a shell', 'On a bird'],
      fact: 'The babies hold on tight until they are big enough to be on their own.',
    },
    {
      q: 'What do we call a long line of mountains together?',
      answers: ['A mountain range', 'A mountain pile', 'A mountain herd', 'A mountain cloud'],
      fact: 'Some mountain ranges stretch across whole countries.',
    },
  ],
  volcano: [
    {
      q: 'What do we call hot melted rock that pours out of a volcano?',
      answers: ['Lava', 'Snow', 'Sand', 'Sap'],
      fact: 'Lava can be hotter than 1,000 degrees!',
    },
    {
      q: 'Every Zebonky is a mix of how many animals?',
      answers: ['Two', 'One', 'Five', 'Ten'],
      fact: 'Like Charlie, who is part chimpanzee and part cheetah.',
    },
    {
      q: 'What lightning symbol does every Zebonky have on its chest?',
      answers: ['A Z-Bolt', 'A Z-Star', 'A Z-Moon', 'A Z-Heart'],
      fact: 'A Z-Bolt pulses in danger and glows when a Zebonky wins.',
    },
    {
      q: 'A volcano that is sleeping but could wake up someday is called...',
      answers: ['Dormant', 'Extinct', 'Melted', 'Hollow'],
      fact: 'Dormant means sleeping.',
    },
    {
      q: 'When lava cools down, what does it turn into?',
      answers: ['Rock', 'Water', 'Sand castles', 'Glass bottles'],
      fact: 'Some islands, like Hawaii, are made from cooled lava.',
    },
  ],
  unchartedW: [
    {
      q: 'A group of otters resting together in the water is called a...',
      answers: ['Raft', 'Herd', 'Flock', 'Swarm'],
      fact: 'Some otter rafts have hundreds of otters in them!',
    },
    {
      q: 'A cockatoo is a kind of...',
      answers: ['Parrot', 'Owl', 'Penguin', 'Duck'],
      fact: 'Like other parrots, cockatoos can learn to copy sounds.',
    },
    {
      q: 'The word "armadillo" means "little armored one" in which language?',
      answers: ['Spanish', 'French', 'Japanese', 'German'],
      fact: 'Spanish explorers named the armadillo after its tough shell.',
    },
    {
      q: 'Which tool shows explorers which way is north?',
      answers: ['A compass', 'A ruler', 'A clock', 'A spoon'],
      fact: 'A compass needle is a tiny magnet.',
    },
    {
      q: 'On a map, what does the key (or legend) tell you?',
      answers: ['What the symbols mean', 'How to open a door', 'What time it is', 'Who drew it'],
      fact: 'Map makers use little pictures so lots of places fit on one page.',
    },
  ],
  unchartedE: [
    {
      q: 'Can a cheetah roar like a lion?',
      answers: ['No, it purrs and chirps', 'Yes, louder than a lion', 'Only underwater', 'Only at night'],
      fact: 'A cheetah\'s chirp sounds a lot like a bird!',
    },
    {
      q: 'Sharks have been swimming in the ocean since...',
      answers: ['Before the dinosaurs', 'Last year', 'Cars were invented', 'About 100 years ago'],
      fact: 'Sharks are older than trees, too!',
    },
    {
      q: 'Wild axolotls come from lakes in which country?',
      answers: ['Mexico', 'Canada', 'Egypt', 'Iceland'],
      fact: 'Wild axolotls live in the canals and lakes around Mexico City.',
    },
    {
      q: 'Cheetah cubs have fluffy fur along their backs. What is it called?',
      answers: ['A mantle', 'A saddle', 'A blanket', 'A crown'],
      fact: 'The fluffy mantle may help cubs hide in tall grass.',
    },
    {
      q: 'Where does the sun come up in the morning?',
      answers: ['In the east', 'In the west', 'In the north', 'In the south'],
      fact: 'Explorers watch the sunrise to find which way is east.',
    },
  ],
};
