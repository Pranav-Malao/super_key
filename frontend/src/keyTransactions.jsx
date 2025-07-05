import React, { useEffect, useState } from 'react';
import axios from 'axios';

const KeyTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const pageSize = 2;

  const fetchTransactions = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const res = await axios.get('http://localhost:3000/api/keys/transactions', {
        params: {
          pageSize,
          cursor: nextCursor
        },
        withCredentials: true
      });

      const { transactions: newTxns, nextCursor: newCursor, hasMore: more } = res.data;

      setTransactions(prev => [...prev, ...newTxns]);
      setNextCursor(newCursor);
      setHasMore(more);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatDate = millis => new Date(millis).toLocaleString();

  return (
    <div>
      <h2>🔑 Key Transactions</h2>
      <ul>
        {transactions.map(txn => (
          <li key={txn.id} style={{ marginBottom: '1rem' }}>
            <strong>Action:</strong> {txn.action} <br />
            <strong>Key Type:</strong> {txn.keyType} <br />
            <strong>From:</strong> {txn.fromUser} <br />
            <strong>To:</strong> {txn.toUser} <br />
            <strong>Time:</strong> {formatDate(txn.timestamp._seconds * 1000)}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button onClick={fetchTransactions} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}

      {!hasMore && <p>✅ No more transactions to load.</p>}
    </div>
  );
};

export default KeyTransactions;