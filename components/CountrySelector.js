import React from 'react';
import { Menu, Button } from 'react-native-paper';

export default function CountrySelector({ countries, selected, visible, onOpen, onClose, onSelect }) {
  return (
    <Menu
      visible={visible}
      onDismiss={onClose}
      anchor={<Button mode="outlined" onPress={onOpen} icon="earth" style={{ alignSelf: 'flex-start', borderRadius: 20 }}>{selected ? selected.name : 'انتخاب کشور'}</Button>}
    >
      {countries.map((c) => <Menu.Item key={c.id} title={c.name} onPress={() => onSelect({ id: c.id, name: c.name })} />)}
    </Menu>
  );
}