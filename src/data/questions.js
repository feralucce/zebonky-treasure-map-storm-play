// Prototype question bank, three per level (one per treasure).
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
  ],
};
