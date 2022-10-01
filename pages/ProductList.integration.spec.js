import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import axios from 'axios';
import ProductList from '.';
import ProductCard from '@/components/ProductCard';
import Search from '@/components/Search';
import { makeServer } from '@/miragejs/server';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

describe('ProductList - integration', () => {
  let server;

  beforeEach(() => {
    server = makeServer({ enviroment: 'test' });
  });

  afterEach(() => {
    server.shutdown();
    jest.clearAllMocks();
  });

  const mountProductList = async (
    quantity = 10,
    overrides = [],
    shouldReject
  ) => {
    const products = await getProducts(quantity, overrides);

    if (shouldReject) {
      axios.get.mockReturnValue(
        Promise.reject(new Error('Problemas ao carregar a lista!'))
      );
    } else {
      axios.get.mockReturnValue(Promise.resolve({ data: { products } }));
    }

    const wrapper = mount(ProductList, {
      mocks: {
        $axios: axios,
      },
    });

    await nextTick();

    return { products, wrapper };
  };

  const getProducts = (quantity = 10, overrides = []) => [
    ...server.createList('product', quantity),
    ...overrides.map((override) => server.create('product', override)),
  ];

  it('should mount the component', async () => {
    const { wrapper } = await mountProductList();

    expect(wrapper.vm).toBeDefined();
  });

  it('should mount the Search component', async () => {
    const { wrapper } = await mountProductList();

    expect(wrapper.findComponent(Search)).toBeDefined();
  });

  it('should call axios.get on component mount', async () => {
    await mountProductList();

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenLastCalledWith('/api/products');
  });

  it('should mount the ProductCard component 10 times', async () => {
    const { wrapper } = await mountProductList();

    const cards = wrapper.findAllComponents(ProductCard);
    expect(cards).toHaveLength(10);
  });

  it('should display the error message wneh Promise rejects', async () => {
    const { wrapper } = await mountProductList(10, [], true);
    expect(wrapper.text()).toContain('Problemas ao carregar a lista!');
  });

  it('should filter the product list when a search is performed', async () => {
    // Arrenge
    const { wrapper } = await mountProductList(10, [
      { title: 'Meu relógio amado' },
      { title: 'Meu outro relógio estimado' },
    ]);

    // Act
    const search = wrapper.findComponent(Search);
    search.find('input[type="search"]').setValue('relógio');
    await search.find('form').trigger('submit');

    // Assert
    const cards = wrapper.findAllComponents(ProductCard);
    expect(wrapper.vm.searchTerm).toEqual('relógio');
    expect(cards).toHaveLength(2);
  });

  it('should filter the product list when a search is performed', async () => {
    // Arrenge
    const { wrapper } = await mountProductList(10, [
      { title: 'Meu relógio amado' },
    ]);

    // Act
    const search = wrapper.findComponent(Search);
    search.find('input[type="search"]').setValue('relógio');
    await search.find('form').trigger('submit');
    search.find('input[type="search"]').setValue('');
    await search.find('form').trigger('submit');

    // Assert
    const cards = wrapper.findAllComponents(ProductCard);
    expect(wrapper.vm.searchTerm).toEqual('');
    expect(cards).toHaveLength(11);
  });
});
