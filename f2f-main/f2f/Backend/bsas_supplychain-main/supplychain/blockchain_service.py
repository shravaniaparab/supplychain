import hashlib
import json
from web3 import Web3
from django.conf import settings


CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "batchId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "snapshotHash", "type": "bytes32"},
            {"internalType": "string", "name": "context", "type": "string"},
        ],
        "name": "anchorHash",
        "outputs": [{"internalType": "uint256", "name": "recordIndex", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


def _get_web3():
    return Web3(Web3.HTTPProvider(settings.POLYGON_AMOY_RPC_URL))


def _get_contract(w3):
    return w3.eth.contract(
        address=Web3.to_checksum_address(settings.HASHANCHOR_CONTRACT_ADDRESS),
        abi=CONTRACT_ABI,
    )


def generate_batch_snapshot(batch):
    return {
        "product_batch_id": str(batch.product_batch_id),
        "farmer_wallet": batch.farmer.wallet_id or "",
        "crop_type": batch.crop_type,
        "quantity": str(batch.quantity),
        "harvest_date": str(batch.harvest_date),
        "farm_location": batch.farm_location or "",
        "status": batch.status,
        "created_at": batch.created_at.isoformat() if batch.created_at else "",
    }


def generate_batch_hash(batch):
    snapshot = generate_batch_snapshot(batch)
    encoded = json.dumps(snapshot, sort_keys=True).encode()
    return hashlib.sha256(encoded).hexdigest()


def anchor_batch_to_blockchain(batch, context="BATCH_CREATED"):
    w3 = _get_web3()
    contract = _get_contract(w3)

    private_key = settings.BLOCKCHAIN_WRITER_PRIVATE_KEY
    account = w3.eth.account.from_key(private_key)

    batch_id_bytes32 = Web3.keccak(text=str(batch.product_batch_id))
    snapshot_hash_hex = generate_batch_hash(batch)
    snapshot_hash_bytes32 = Web3.to_bytes(hexstr="0x" + snapshot_hash_hex)

    nonce = w3.eth.get_transaction_count(account.address)

    tx = contract.functions.anchorHash(
        batch_id_bytes32,
        snapshot_hash_bytes32,
        context
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 300000,
        "gasPrice": w3.eth.gas_price,
        "chainId": 80002,
    })

    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

    return {
        "snapshot_hash": "0x" + snapshot_hash_hex,
        "tx_hash": w3.to_hex(tx_hash),
    }