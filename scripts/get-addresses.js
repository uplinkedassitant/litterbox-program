const {PublicKey} = require('@solana/web3.js');
const programId = new PublicKey('BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq');
const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('virtual_pool_v2')], programId);
const litterMint = new PublicKey('9EJwVq9dfZHLH1AtRcH9eaJzewq4vmxUJPboja45DoZj');

console.log('VITE_PROGRAM_ID=' + programId.toString());
console.log('VITE_CONFIG_PDA=' + configPDA.toString());
console.log('VITE_POOL_PDA=' + poolPDA.toString());
console.log('VITE_LITTER_MINT=' + litterMint.toString());
